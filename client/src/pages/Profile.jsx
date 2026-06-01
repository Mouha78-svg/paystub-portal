import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import {
  Box, Card, CardContent, Grid, Typography, Avatar, Divider,
  TextField, Button, Alert, InputAdornment, IconButton, Chip, LinearProgress
} from '@mui/material';
import { Visibility, VisibilityOff, PersonOutlined, LockOutlined, SaveOutlined } from '@mui/icons-material';

function passwordStrength(pwd) {
  let s = 0;
  if (pwd.length >= 8) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return s;
}
const STRENGTH = ['', 'Faible', 'Moyen', 'Fort', 'Très fort'];
const COLORS = ['', '#f57c00', '#f9a825', '#388e3c', '#1b5e20'];

export default function Profile() {
  const { user } = useAuth();
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [watchNew, setWatchNew] = useState('');
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const initials = user ? `${user.prenom[0]}${user.nom[0]}`.toUpperCase() : 'U';

  const onSubmit = async ({ old_password, new_password, confirm_password }) => {
    if (new_password !== confirm_password) { setError('Les mots de passe ne correspondent pas'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      await api.post('/auth/change-password', {
        matricule: user.matricule, pin: old_password, new_password
      });
      setSuccess('Mot de passe mis à jour avec succès');
      reset();
      setWatchNew('');
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const strength = passwordStrength(watchNew);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1 }}>Mon profil</Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>Informations personnelles et sécurité</Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 72, height: 72, fontSize: 24, mx: 'auto', mb: 2 }}>{initials}</Avatar>
                <Typography variant="h6">{user?.prenom} {user?.nom}</Typography>
                <Chip label={user?.service} color="primary" size="small" sx={{ mt: 1 }} />
              </Box>
              <Divider sx={{ mb: 2 }} />
              {[
                { label: 'Matricule', value: user?.matricule },
                { label: 'Prénom', value: user?.prenom },
                { label: 'Nom', value: user?.nom },
                { label: 'Service', value: user?.service },
              ].map(item => (
                <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                  <Typography variant="body2" fontWeight={500}>{item.value}</Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <LockOutlined color="primary" />
                <Typography variant="h6">Changer de mot de passe</Typography>
              </Box>

              {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

              <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <TextField fullWidth label="Mot de passe actuel / Code PIN" sx={{ mb: 2 }}
                  type={showOld ? 'text' : 'password'}
                  {...register('old_password', { required: 'Champ requis' })}
                  error={!!errors.old_password} helperText={errors.old_password?.message}
                  InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowOld(!showOld)}>{showOld ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }}
                />
                <TextField fullWidth label="Nouveau mot de passe" sx={{ mb: 1 }}
                  type={showNew ? 'text' : 'password'}
                  {...register('new_password', { required: 'Champ requis', minLength: { value: 8, message: 'Minimum 8 caractères' }, onChange: e => setWatchNew(e.target.value) })}
                  error={!!errors.new_password} helperText={errors.new_password?.message}
                  InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowNew(!showNew)}>{showNew ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }}
                />
                {watchNew && (
                  <Box sx={{ mb: 2 }}>
                    <LinearProgress variant="determinate" value={(strength / 4) * 100}
                      sx={{ height: 5, borderRadius: 3, mb: 0.5, bgcolor: '#eee', '& .MuiLinearProgress-bar': { bgcolor: COLORS[strength] } }} />
                    <Typography variant="caption" sx={{ color: COLORS[strength], fontWeight: 500 }}>{STRENGTH[strength]}</Typography>
                  </Box>
                )}
                <TextField fullWidth label="Confirmer le nouveau mot de passe" sx={{ mb: 3 }}
                  type="password"
                  {...register('confirm_password', { required: 'Champ requis' })}
                  error={!!errors.confirm_password} helperText={errors.confirm_password?.message}
                />
                <Button type="submit" variant="contained" disabled={loading} startIcon={<SaveOutlined />}>
                  {loading ? 'Enregistrement…' : 'Enregistrer les modifications'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
