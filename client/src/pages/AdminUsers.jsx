import { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Tooltip, Chip, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControlLabel, Switch, Alert, Skeleton, CircularProgress,
  MenuItem, InputAdornment, Snackbar, Divider, List, ListItem, ListItemText, LinearProgress
} from '@mui/material';
import {
  PersonAddOutlined, EditOutlined, DeleteOutlined, LockResetOutlined,
  AdminPanelSettingsOutlined, PersonOffOutlined, ContentCopyOutlined,
  CheckCircleOutlined, VisibilityOutlined, VisibilityOffOutlined, SearchOutlined,
  RestartAltOutlined, UploadFileOutlined, WarningAmberOutlined,
  AddOutlined, PictureAsPdfOutlined, ReceiptLongOutlined,
  ChatBubbleOutlineOutlined, SendOutlined
} from '@mui/icons-material';

const SERVICES = ['Informatique', 'Ressources Humaines', 'Finance', 'Direction', 'Logistique'];
const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function PayslipFields({ form, setForm, pdfFileRef }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          select label="Mois" value={form.mois}
          onChange={e => setForm(prev => ({ ...prev, mois: e.target.value }))}
          required fullWidth size="small"
        >
          {MOIS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
        </TextField>
        <TextField
          label="Année" type="number" value={form.annee}
          onChange={e => setForm(prev => ({ ...prev, annee: e.target.value }))}
          required fullWidth size="small"
          inputProps={{ min: 2020, max: 2035 }}
        />
      </Box>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          label="Salaire brut (FCFA)" type="number" value={form.salaire_brut}
          onChange={e => setForm(prev => ({ ...prev, salaire_brut: e.target.value }))}
          required fullWidth size="small"
        />
        <TextField
          label="Salaire net (FCFA)" type="number" value={form.salaire_net}
          onChange={e => setForm(prev => ({ ...prev, salaire_net: e.target.value }))}
          required fullWidth size="small"
        />
      </Box>
      <Box>
        <Button
          variant="outlined" size="small" startIcon={<UploadFileOutlined />}
          onClick={() => pdfFileRef.current.click()} fullWidth
        >
          {form.pdfFile ? form.pdfFile.name : 'Joindre un PDF (optionnel)'}
        </Button>
        {form.pdfFile && (
          <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PictureAsPdfOutlined sx={{ fontSize: 14 }} /> {form.pdfFile.name}
          </Typography>
        )}
        <input
          ref={pdfFileRef} type="file" accept=".pdf" style={{ display: 'none' }}
          onChange={e => { setForm(prev => ({ ...prev, pdfFile: e.target.files[0] || null })); e.target.value = ''; }}
        />
      </Box>
    </Box>
  );
}

const EMPTY_FORM = { matricule: '', nom: '', prenom: '', service: '', email: '', pin: '', is_admin: false };
const EMPTY_PAYSLIP = { mois: '', annee: new Date().getFullYear(), salaire_brut: '', salaire_net: '', pdfFile: null };

function UserAvatar({ nom, prenom }) {
  const initials = `${prenom?.[0] ?? ''}${nom?.[0] ?? ''}`.toUpperCase();
  return <Avatar sx={{ bgcolor: '#7D3C00', width: 32, height: 32, fontSize: 12 }}>{initials}</Avatar>;
}

function StatusChips({ user }) {
  if (user.first_login) return <Chip label="1ère connexion" size="small" color="warning" variant="outlined" />;
  if (user.is_active) return <Chip label="Actif" size="small" color="success" variant="outlined" icon={<CheckCircleOutlined />} />;
  return <Chip label="Inactif" size="small" color="default" variant="outlined" icon={<PersonOffOutlined />} />;
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');

  // Add / Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPin, setShowPin] = useState(false);

  // Initial payslip (create mode)
  const [initialPayslip, setInitialPayslip] = useState(EMPTY_PAYSLIP);

  // Payslip management (edit mode)
  const [payslips, setPayslips] = useState([]);
  const [payslipsLoading, setPayslipsLoading] = useState(false);
  const [payslipDialogOpen, setPayslipDialogOpen] = useState(false);
  const [payslipEditTarget, setPayslipEditTarget] = useState(null);
  const [payslipForm, setPayslipForm] = useState(EMPTY_PAYSLIP);
  const [payslipError, setPayslipError] = useState('');
  const [payslipSaving, setPayslipSaving] = useState(false);
  const [payslipDeleting, setPayslipDeleting] = useState(null);

  // Feedback
  const [feedback, setFeedback] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [newFeedback, setNewFeedback] = useState('');
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackDeleting, setFeedbackDeleting] = useState(null);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Quick reset to default dialog
  const [quickResetTarget, setQuickResetTarget] = useState(null);
  const [quickResetting, setQuickResetting] = useState(false);
  const [quickResetResult, setQuickResetResult] = useState(null);

  // Reset password dialog
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPin, setResetPin] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState(null);

  // CSV import dialog
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState(null);
  const [csvError, setCsvError] = useState('');

  const csvFileRef = useRef();
  const pdfFileRef = useRef();

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

  // ── Payslip helpers ─────────────────────────────────────────────────────────

  const fetchFeedback = async (matricule) => {
    setFeedbackLoading(true);
    try {
      const { data } = await api.get(`/admin/users/${matricule}/feedback`);
      setFeedback(data);
    } catch {
      setFeedback([]);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleAddFeedback = async () => {
    if (!newFeedback.trim()) return;
    setFeedbackSaving(true);
    try {
      await api.post(`/admin/users/${editTarget.matricule}/feedback`, { message: newFeedback });
      setNewFeedback('');
      fetchFeedback(editTarget.matricule);
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur');
    } finally {
      setFeedbackSaving(false);
    }
  };

  const handleDeleteFeedback = async (id) => {
    setFeedbackDeleting(id);
    try {
      await api.delete(`/admin/feedback/${id}`);
      fetchFeedback(editTarget.matricule);
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur');
    } finally {
      setFeedbackDeleting(null);
    }
  };

  const fetchPayslips = async (matricule) => {
    setPayslipsLoading(true);
    try {
      const { data } = await api.get(`/admin/users/${matricule}/payslips`);
      setPayslips(data);
    } catch {
      setPayslips([]);
    } finally {
      setPayslipsLoading(false);
    }
  };

  const openPayslipCreate = () => {
    setPayslipEditTarget(null);
    setPayslipForm(EMPTY_PAYSLIP);
    setPayslipError('');
    setPayslipDialogOpen(true);
  };

  const openPayslipEdit = (p) => {
    setPayslipEditTarget(p);
    setPayslipForm({ mois: p.mois, annee: p.annee, salaire_brut: p.salaire_brut, salaire_net: p.salaire_net, pdfFile: null });
    setPayslipError('');
    setPayslipDialogOpen(true);
  };

  const handlePayslipSave = async () => {
    setPayslipError('');
    if (!payslipForm.mois || !payslipForm.annee || !payslipForm.salaire_brut || !payslipForm.salaire_net) {
      setPayslipError('Tous les champs sont requis.');
      return;
    }
    setPayslipSaving(true);
    const fd = new FormData();
    fd.append('mois', payslipForm.mois);
    fd.append('annee', payslipForm.annee);
    fd.append('salaire_brut', payslipForm.salaire_brut);
    fd.append('salaire_net', payslipForm.salaire_net);
    if (payslipForm.pdfFile) fd.append('pdf', payslipForm.pdfFile);
    try {
      if (payslipEditTarget) {
        await api.put(`/admin/payslips/${payslipEditTarget.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        setSnack('Bulletin mis à jour.');
      } else {
        await api.post(`/admin/users/${editTarget.matricule}/payslips`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        setSnack('Bulletin ajouté.');
      }
      setPayslipDialogOpen(false);
      fetchPayslips(editTarget.matricule);
    } catch (e) {
      setPayslipError(e.response?.data?.message || "Erreur lors de l'enregistrement");
    } finally {
      setPayslipSaving(false);
    }
  };

  const handlePayslipDelete = async (p) => {
    setPayslipDeleting(p.id);
    try {
      await api.delete(`/admin/payslips/${p.id}`);
      setSnack('Bulletin supprimé.');
      fetchPayslips(editTarget.matricule);
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setPayslipDeleting(null);
    }
  };

  // ── Add / Edit employee ─────────────────────────────────────────────────────

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setInitialPayslip(EMPTY_PAYSLIP);
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
    setPayslips([]);
    setFeedback([]);
    setNewFeedback('');
    setDialogOpen(true);
    fetchPayslips(user.matricule);
    fetchFeedback(user.matricule);
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.matricule || !form.nom || !form.prenom || !form.service) {
      setFormError('Matricule, nom, prénom et service sont requis.');
      return;
    }
    setSaving(true);
    try {
      let createdMatricule = form.matricule.toUpperCase();
      if (editTarget) {
        await api.put(`/admin/users/${editTarget.matricule}`, {
          nom: form.nom, prenom: form.prenom, service: form.service,
          email: form.email, is_admin: form.is_admin, is_active: editTarget.is_active,
        });
        setSnack('Employé mis à jour.');
      } else {
        const { data } = await api.post('/admin/users', {
          matricule: form.matricule, nom: form.nom, prenom: form.prenom,
          service: form.service, email: form.email,
          pin: form.pin || undefined, is_admin: form.is_admin,
        });
        setSnack(`Employé créé. Mot de passe 1ère connexion : ${data.pin}`);

        // Save initial payslip if provided
        const ip = initialPayslip;
        if (ip.mois && ip.annee && ip.salaire_brut && ip.salaire_net) {
          const fd = new FormData();
          fd.append('mois', ip.mois);
          fd.append('annee', ip.annee);
          fd.append('salaire_brut', ip.salaire_brut);
          fd.append('salaire_net', ip.salaire_net);
          if (ip.pdfFile) fd.append('pdf', ip.pdfFile);
          try {
            await api.post(`/admin/users/${createdMatricule}/payslips`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          } catch { /* payslip save failure is non-fatal */ }
        }
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
      const { data } = await api.post(`/admin/users/${resetTarget.matricule}/reset-password`, { pin: resetPin || undefined });
      setResetResult(data.pin);
      fetchUsers();
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur lors de la réinitialisation');
      setResetTarget(null);
    } finally {
      setResetting(false);
    }
  };

  const handleQuickReset = async () => {
    setQuickResetting(true);
    try {
      const { data } = await api.post(`/admin/users/${quickResetTarget.matricule}/reset-password`, {});
      setQuickResetResult(data.pin);
      fetchUsers();
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur lors de la réinitialisation');
      setQuickResetTarget(null);
    } finally {
      setQuickResetting(false);
    }
  };

  const closeQuickReset = () => {
    setQuickResetTarget(null);
    setQuickResetResult(null);
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

  // ── CSV import ──────────────────────────────────────────────────────────────

  const openCsvDialog = () => {
    setCsvResult(null);
    setCsvError('');
    setCsvDialogOpen(true);
  };

  const handleCsvImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvUploading(true);
    setCsvResult(null);
    setCsvError('');
    const fd = new FormData();
    fd.append('csv', file);
    try {
      const { data } = await api.post('/sync/csv', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setCsvResult(data);
      fetchUsers();
    } catch (err) {
      setCsvError(err.response?.data?.message || "Erreur lors de l'importation");
    } finally {
      setCsvUploading(false);
      e.target.value = '';
    }
  };

  // ── Filter ──────────────────────────────────────────────────────────────────

  const q = searchQuery.trim().toLowerCase();
  const filteredUsers = q
    ? users.filter(u =>
        u.matricule.toLowerCase().includes(q) ||
        `${u.prenom} ${u.nom}`.toLowerCase().includes(q)
      )
    : users;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h5">Gestion des utilisateurs</Typography>
            {!loading && (
              <Chip
                label={`${users.length} utilisateur${users.length !== 1 ? 's' : ''}`}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            )}
          </Box>
          <Typography color="text.secondary">Ajouter, modifier ou supprimer des comptes employés</Typography>
        </Box>
        <Button variant="contained" startIcon={<PersonAddOutlined />} onClick={openCreate}>
          Nouvel employé
        </Button>
      </Box>

      <TextField
        placeholder="Rechercher par matricule ou nom…"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        size="small"
        sx={{ mb: 3, width: { xs: '100%', sm: 340 } }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchOutlined fontSize="small" sx={{ color: 'text.secondary' }} />
            </InputAdornment>
          ),
        }}
      />

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
              : filteredUsers.length === 0
              ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">Aucun employé trouvé pour « {searchQuery} »</Typography>
                  </TableCell>
                </TableRow>
              )
              : filteredUsers.map(u => (
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
                    <Tooltip title="Modifier / Gérer les bulletins">
                      <IconButton size="small" onClick={() => openEdit(u)}><EditOutlined fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Réinitialiser le mot de passe (PIN aléatoire)">
                      <IconButton size="small" color="info" onClick={() => setQuickResetTarget(u)}><RestartAltOutlined fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Réinitialiser le mot de passe (personnalisé)">
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

      {/* ── Add / Edit Employee Dialog ── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editTarget ? `Modifier — ${editTarget.prenom} ${editTarget.nom}` : 'Nouvel employé'}</DialogTitle>
        <DialogContent dividers>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

          {/* Employee fields */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Matricule"
              value={form.matricule}
              onChange={e => setForm(f => ({ ...f, matricule: e.target.value.toUpperCase() }))}
              disabled={Boolean(editTarget)}
              required fullWidth
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
                label="Mot de passe initial (laissez vide pour utiliser le défaut)"
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

          {/* ── Payslip section ── */}
          <Divider sx={{ my: 3 }} />

          {editTarget ? (
            // Edit mode: list existing payslips + add button
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ReceiptLongOutlined fontSize="small" color="primary" />
                  <Typography fontWeight={600} fontSize={14}>Bulletins de paie</Typography>
                </Box>
                <Button size="small" variant="outlined" startIcon={<AddOutlined />} onClick={openPayslipCreate}>
                  Ajouter
                </Button>
              </Box>
              {payslipsLoading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {[1, 2].map(i => <Skeleton key={i} height={36} />)}
                </Box>
              ) : payslips.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                  Aucun bulletin enregistré pour cet employé.
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>Période</TableCell>
                      <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>Brut</TableCell>
                      <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>Net</TableCell>
                      <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>PDF</TableCell>
                      <TableCell align="right" sx={{ fontSize: 12, fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payslips.map(p => (
                      <TableRow key={p.id} hover>
                        <TableCell sx={{ fontSize: 12 }}>{p.mois} {p.annee}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{Number(p.salaire_brut).toLocaleString('fr-FR')} F</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{Number(p.salaire_net).toLocaleString('fr-FR')} F</TableCell>
                        <TableCell>
                          <Tooltip title={p.fichier_pdf}>
                            <PictureAsPdfOutlined fontSize="small" color="error" />
                          </Tooltip>
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          <Tooltip title="Modifier / remplacer le PDF">
                            <IconButton size="small" onClick={() => openPayslipEdit(p)}>
                              <EditOutlined sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Supprimer">
                            <IconButton size="small" color="error" onClick={() => handlePayslipDelete(p)}
                              disabled={payslipDeleting === p.id}>
                              {payslipDeleting === p.id
                                ? <CircularProgress size={14} />
                                : <DeleteOutlined sx={{ fontSize: 15 }} />}
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* ── Feedback section ── */}
              <Divider sx={{ my: 3 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <ChatBubbleOutlineOutlined fontSize="small" color="primary" />
                <Typography fontWeight={600} fontSize={14}>Notes / Messages</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  placeholder="Ajouter une note pour cet employé…"
                  value={newFeedback}
                  onChange={e => setNewFeedback(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddFeedback(); } }}
                  size="small"
                  fullWidth
                  multiline
                  maxRows={3}
                  inputProps={{ maxLength: 1000 }}
                />
                <Tooltip title="Envoyer">
                  <span>
                    <IconButton
                      color="primary"
                      onClick={handleAddFeedback}
                      disabled={feedbackSaving || !newFeedback.trim()}
                    >
                      {feedbackSaving ? <CircularProgress size={20} /> : <SendOutlined />}
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
              {feedbackLoading ? (
                [1, 2].map(i => <Skeleton key={i} height={48} sx={{ mb: 1, borderRadius: 2 }} />)
              ) : feedback.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Aucun message pour cet employé.</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {feedback.map(f => {
                    const fromEmployee = f.created_by === editTarget?.matricule;
                    return (
                      <Box key={f.id} sx={{
                        p: 1.5, borderRadius: 2, border: '1px solid',
                        bgcolor: fromEmployee ? 'secondary.50' : 'primary.50',
                        borderColor: fromEmployee ? 'secondary.200' : 'primary.100',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1
                      }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" fontWeight={600} color={fromEmployee ? 'secondary.dark' : 'primary.dark'} sx={{ mb: 0.5, display: 'block' }}>
                            {fromEmployee ? `${editTarget?.prenom} ${editTarget?.nom}` : 'Administration'}
                          </Typography>
                          <Typography fontSize={13}>{f.message}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(f.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </Typography>
                        </Box>
                        <Tooltip title="Supprimer">
                          <IconButton size="small" color="error" onClick={() => handleDeleteFeedback(f.id)} disabled={feedbackDeleting === f.id}>
                            {feedbackDeleting === f.id ? <CircularProgress size={14} /> : <DeleteOutlined sx={{ fontSize: 15 }} />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>
          ) : (
            // Create mode: optional initial payslip
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <ReceiptLongOutlined fontSize="small" color="primary" />
                <Typography fontWeight={600} fontSize={14}>Bulletin initial (optionnel)</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Vous pouvez ajouter un premier bulletin de paie avec un PDF lors de la création de l'employé.
              </Typography>
              <PayslipFields form={initialPayslip} setForm={setInitialPayslip} pdfFileRef={pdfFileRef} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : (editTarget ? 'Enregistrer' : 'Créer')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Payslip Add / Edit Sub-Dialog ── */}
      <Dialog open={payslipDialogOpen} onClose={() => setPayslipDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {payslipEditTarget
            ? `Modifier — ${payslipEditTarget.mois} ${payslipEditTarget.annee}`
            : 'Ajouter un bulletin'}
        </DialogTitle>
        <DialogContent dividers>
          {payslipError && <Alert severity="error" sx={{ mb: 2 }}>{payslipError}</Alert>}
          <Box sx={{ pt: 1 }}>
            <PayslipFields form={payslipForm} setForm={setPayslipForm} pdfFileRef={pdfFileRef} />
            {payslipEditTarget && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
                La période (mois / année) ne peut pas être modifiée. Pour changer la période, supprimez ce bulletin et créez-en un nouveau.
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayslipDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handlePayslipSave} disabled={payslipSaving}>
            {payslipSaving ? <CircularProgress size={20} /> : (payslipEditTarget ? 'Enregistrer' : 'Ajouter')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Employee Dialog ── */}
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
                label="Mot de passe personnalisé (optionnel)"
                value={resetPin}
                onChange={e => setResetPin(e.target.value)}
                helperText="Laissez vide pour générer un PIN aléatoire"
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

      {/* ── Quick Reset to Default Dialog ── */}
      <Dialog open={Boolean(quickResetTarget)} onClose={closeQuickReset} maxWidth="xs" fullWidth>
        <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
        <DialogContent>
          {quickResetResult ? (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>Compte remis en mode « première connexion ».</Alert>
              <Typography variant="body2" gutterBottom>
                Communiquez ce PIN à l'employé. Il devra définir un nouveau mot de passe lors de sa prochaine connexion.
              </Typography>
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h5" fontWeight={700} letterSpacing={4}>{quickResetResult}</Typography>
                <Tooltip title="Copier le PIN">
                  <IconButton onClick={() => copyToClipboard(quickResetResult)}><ContentCopyOutlined /></IconButton>
                </Tooltip>
              </Box>
            </Box>
          ) : (
            <Typography>
              Générer un nouveau PIN aléatoire pour <strong>{quickResetTarget?.prenom} {quickResetTarget?.nom}</strong> ?
              Le compte repassera en mode « première connexion ».
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          {quickResetResult
            ? <Button variant="contained" onClick={closeQuickReset}>Fermer</Button>
            : <>
              <Button onClick={closeQuickReset}>Annuler</Button>
              <Button variant="contained" color="info" onClick={handleQuickReset} disabled={quickResetting}>
                {quickResetting ? <CircularProgress size={20} /> : 'Réinitialiser'}
              </Button>
            </>
          }
        </DialogActions>
      </Dialog>

      {/* ── CSV Import Dialog ── */}
      <Dialog open={csvDialogOpen} onClose={() => setCsvDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Importer des employés via CSV</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Uploadez un fichier CSV pour créer ou mettre à jour les employés et leurs bulletins de paie.
            Les colonnes <strong>matricule, nom, prenom, mois, annee, salaire_brut, salaire_net</strong> sont obligatoires.
            Les colonnes <strong>service, email, is_admin, pin, fichier_pdf</strong> sont optionnelles.
          </Typography>
          <Paper sx={{ bgcolor: 'grey.900', p: 2, borderRadius: 2, fontFamily: 'monospace', fontSize: 11, color: '#4caf50', overflow: 'auto', mb: 2 }}>
            {'matricule,nom,prenom,service,email,is_admin,pin,mois,annee,salaire_brut,salaire_net,fichier_pdf\n'}
            {'EMP004,Diop,Aminata,Finance,aminata@ex.sn,0,,Janvier,2025,480000,390000,EMP004_2025_01.pdf'}
          </Paper>
          <Box sx={{ bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200', borderRadius: 2, p: 1.5, mb: 2 }}>
            <Typography variant="caption" color="info.dark" component="div" sx={{ lineHeight: 1.8 }}>
              <strong>service</strong> — Informatique, Ressources Humaines, Finance, Direction, Logistique…<br />
              <strong>is_admin</strong> — 0 ou 1 (laisser vide = 0)<br />
              <strong>pin</strong> — mot de passe première connexion (laisser vide = PIN aléatoire généré)<br />
              <strong>fichier_pdf</strong> — nom du fichier PDF (laisser vide = généré automatiquement)
            </Typography>
          </Box>

          {csvError && <Alert severity="error" sx={{ mb: 2 }}>{csvError}</Alert>}

          {csvResult ? (
            <Box>
              <Alert severity="success" icon={<CheckCircleOutlined />} sx={{ mb: 2 }}>
                {csvResult.count} bulletin(s) importé(s) avec succès.
              </Alert>
              {csvResult.errors?.length > 0 && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <WarningAmberOutlined color="warning" fontSize="small" />
                    <Typography variant="body2" fontWeight={600}>{csvResult.errors.length} ligne(s) ignorée(s)</Typography>
                  </Box>
                  <List dense>
                    {csvResult.errors.map((e, i) => (
                      <ListItem key={i} sx={{ py: 0 }}>
                        <ListItemText primary={e} primaryTypographyProps={{ fontSize: 12, color: 'warning.dark' }} />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </Box>
          ) : (
            <Box
              onClick={() => !csvUploading && csvFileRef.current.click()}
              sx={{
                border: '2px dashed', borderColor: 'primary.200', borderRadius: 3, p: 4,
                textAlign: 'center', cursor: csvUploading ? 'default' : 'pointer', transition: 'all 0.2s',
                '&:hover': csvUploading ? {} : { borderColor: 'primary.main', bgcolor: 'primary.50' },
              }}
            >
              <UploadFileOutlined sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography fontWeight={500}>Cliquez pour choisir un fichier CSV</Typography>
              <Typography variant="caption" color="text.secondary">Fichiers .csv uniquement</Typography>
              {csvUploading && <LinearProgress sx={{ mt: 2 }} />}
            </Box>
          )}

          <input ref={csvFileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvImport} />
        </DialogContent>
        <DialogActions>
          {csvResult ? (
            <Button variant="contained" onClick={() => setCsvDialogOpen(false)}>Fermer</Button>
          ) : (
            <>
              <Button onClick={() => setCsvDialogOpen(false)}>Annuler</Button>
              <Button variant="contained" startIcon={<UploadFileOutlined />} onClick={() => csvFileRef.current.click()} disabled={csvUploading}>
                {csvUploading ? <CircularProgress size={20} /> : 'Choisir un fichier'}
              </Button>
            </>
          )}
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
