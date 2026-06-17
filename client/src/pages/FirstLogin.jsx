import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  Box, TextField, Button, Typography, Alert,
  InputAdornment, IconButton, CircularProgress, LinearProgress,
} from '@mui/material';
import { Visibility, VisibilityOff, CheckCircleOutline } from '@mui/icons-material';

const DIAMOND_BG = `url("data:image/svg+xml,%3Csvg width='44' height='44' viewBox='0 0 44 44' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M22 2 L42 22 L22 42 L2 22 Z' fill='none' stroke='%23fff' stroke-opacity='0.06' stroke-width='1'/%3E%3C/svg%3E")`;

function passwordStrength(pwd) {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
}

const STRENGTH_LABELS = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'];
const STRENGTH_COLORS = ['#c62828', '#f57c00', '#f9a825', '#388e3c', '#1b5e20'];

export default function FirstLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [watchPwd, setWatchPwd] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm();

  if (!state?.matricule) {
    navigate('/login');
    return null;
  }

  const onSubmit = async ({ pin, new_password, confirm_password }) => {
    if (new_password !== confirm_password) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/change-password', {
        matricule: state.matricule, pin, new_password,
      });
      login(data.token, data.employee);
      setDone(true);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création du mot de passe');
    } finally {
      setLoading(false);
    }
  };

  const strength = passwordStrength(watchPwd);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
      {/* Left branding panel */}
      <Box sx={{
        width: { xs: '100%', md: '38%' },
        minHeight: { xs: 200, md: '100vh' },
        bgcolor: '#3D1A00',
        backgroundImage: DIAMOND_BG,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        p: { xs: 3, md: 6 },
        position: { md: 'sticky' }, top: 0, maxHeight: { md: '100vh' },
      }}>
        <Box sx={{
          width: { xs: 72, md: 100 }, height: { xs: 72, md: 100 },
          borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.1)',
          overflow: 'hidden', mb: { xs: 2, md: 3 }, flexShrink: 0,
        }}>
          <Box component="img" src="/logo.png" alt="CROUS"
            sx={{ width: '100%', height: '100%', objectFit: 'contain', p: 1, display: 'block' }} />
        </Box>

        <Typography sx={{
          color: '#fff', fontWeight: 700,
          fontSize: { xs: 22, md: 28 },
          fontFamily: "'Playfair Display', serif",
          textAlign: 'center', lineHeight: 1.2, mb: 1,
        }}>
          Portail RH
        </Typography>

        <Typography sx={{
          color: 'rgba(255,255,255,0.4)', fontSize: 11,
          letterSpacing: 2.5, textTransform: 'uppercase', textAlign: 'center',
        }}>
          UGB — CROUS — Sénégal
        </Typography>

        <Box sx={{ mt: 5, maxWidth: 240, display: { xs: 'none', md: 'block' } }}>
          <Typography sx={{
            color: 'rgba(255,255,255,0.28)', fontSize: 13,
            textAlign: 'center', lineHeight: 2,
          }}>
            Choisissez un mot de passe personnel pour sécuriser votre compte.
          </Typography>
        </Box>
      </Box>

      {/* Right form panel */}
      <Box sx={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: 'background.default', p: { xs: 2, sm: 4, md: 7 },
      }}>
        <Box sx={{ width: '100%', maxWidth: 420 }}>
          {done ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircleOutline sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" sx={{ mb: 1 }}>Compte activé !</Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Redirection vers le tableau de bord…
              </Typography>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <>
              <Typography variant="h5" sx={{ mb: 0.75 }}>Première connexion</Typography>
              <Typography color="text.secondary" sx={{ mb: 1, fontSize: 14, lineHeight: 1.7 }}>
                Matricule : <strong style={{ color: '#2C1A0E' }}>{state.matricule}</strong>
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 4, fontSize: 14, lineHeight: 1.7 }}>
                Saisissez le code PIN reçu de l'administration, puis choisissez votre mot de passe personnel.
              </Typography>

              {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

              <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth label="Code PIN administratif" type="password"
                  placeholder="Code PIN reçu des RH"
                  {...register('pin', { required: 'Code PIN requis' })}
                  error={!!errors.pin} helperText={errors.pin?.message}
                />

                <Box>
                  <TextField
                    fullWidth label="Nouveau mot de passe"
                    type={showPwd ? 'text' : 'password'}
                    {...register('new_password', {
                      required: 'Mot de passe requis',
                      minLength: { value: 8, message: 'Au moins 8 caractères requis' },
                      onChange: e => setWatchPwd(e.target.value),
                    })}
                    error={!!errors.new_password} helperText={errors.new_password?.message}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">
                        <IconButton onClick={() => setShowPwd(!showPwd)}>
                          {showPwd ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>,
                    }}
                  />
                  {watchPwd && (
                    <Box sx={{ mt: 1 }}>
                      <LinearProgress variant="determinate" value={(strength / 4) * 100}
                        sx={{ height: 5, borderRadius: 3, bgcolor: '#EDE3D6',
                          '& .MuiLinearProgress-bar': { bgcolor: STRENGTH_COLORS[strength] } }} />
                      <Typography variant="caption" sx={{ color: STRENGTH_COLORS[strength], fontWeight: 500 }}>
                        {STRENGTH_LABELS[strength]}
                      </Typography>
                    </Box>
                  )}
                </Box>

                <TextField
                  fullWidth label="Confirmer le mot de passe"
                  type={showConfirm ? 'text' : 'password'}
                  {...register('confirm_password', { required: 'Confirmation requise' })}
                  error={!!errors.confirm_password} helperText={errors.confirm_password?.message}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">
                      <IconButton onClick={() => setShowConfirm(!showConfirm)}>
                        {showConfirm ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>,
                  }}
                />

                <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}>
                  {loading ? <CircularProgress size={22} color="inherit" /> : 'Activer mon compte'}
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
