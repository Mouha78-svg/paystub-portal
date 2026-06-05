import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  Alert, Stepper, Step, StepLabel, InputAdornment, IconButton,
  CircularProgress, LinearProgress
} from '@mui/material';
import { Visibility, VisibilityOff, LockResetOutlined, CheckCircleOutline } from '@mui/icons-material';

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
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [watchPwd, setWatchPwd] = useState('');
  const { register, handleSubmit, watch, formState: { errors } } = useForm();

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
        matricule: state.matricule, pin, new_password
      });
      login(data.token, data.employee);
      setStep(2);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création du mot de passe');
    } finally {
      setLoading(false);
    }
  };

  const strength = passwordStrength(watchPwd);

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #5C2D00 0%, #7D3C00 50%, #A85C26 100%)', p: 2
    }}>
      <Box sx={{ width: '100%', maxWidth: 460 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', mb: 2 }}>
            <LockResetOutlined sx={{ color: '#fff', fontSize: 32 }} />
          </Box>
          <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>Première connexion</Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)', mt: 0.5 }}>
            Matricule: <strong style={{ color: '#fff' }}>{state.matricule}</strong>
          </Typography>
        </Box>

        <Card>
          <CardContent sx={{ p: 4 }}>
            <Stepper activeStep={step} sx={{ mb: 3 }}>
              <Step><StepLabel>Vérification PIN</StepLabel></Step>
              <Step><StepLabel>Nouveau mot de passe</StepLabel></Step>
              <Step><StepLabel>Terminé</StepLabel></Step>
            </Stepper>

            {step === 2 ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <CheckCircleOutline sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                <Typography variant="h6">Compte activé !</Typography>
                <Typography variant="body2" color="text.secondary">Redirection vers le tableau de bord…</Typography>
                <CircularProgress size={24} sx={{ mt: 2 }} />
              </Box>
            ) : (
              <>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                  <Alert severity="info" sx={{ mb: 3, fontSize: 13 }}>
                    Saisissez le <strong>code PIN</strong> fourni par votre administration, puis créez votre mot de passe personnel.
                  </Alert>

                  <TextField fullWidth label="Code PIN administratif" sx={{ mb: 2 }}
                    type="password" placeholder="Code PIN reçu des RH"
                    {...register('pin', { required: 'Code PIN requis' })}
                    error={!!errors.pin} helperText={errors.pin?.message}
                  />

                  <TextField fullWidth label="Nouveau mot de passe" sx={{ mb: 1 }}
                    type={showPwd ? 'text' : 'password'}
                    {...register('new_password', {
                      required: 'Mot de passe requis',
                      minLength: { value: 8, message: 'Au moins 8 caractères requis' },
                      onChange: (e) => setWatchPwd(e.target.value)
                    })}
                    error={!!errors.new_password} helperText={errors.new_password?.message}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">
                        <IconButton onClick={() => setShowPwd(!showPwd)}>{showPwd ? <VisibilityOff /> : <Visibility />}</IconButton>
                      </InputAdornment>
                    }}
                  />

                  {watchPwd && (
                    <Box sx={{ mb: 2 }}>
                      <LinearProgress variant="determinate" value={(strength / 4) * 100}
                        sx={{ height: 6, borderRadius: 3, backgroundColor: '#eee',
                          '& .MuiLinearProgress-bar': { backgroundColor: STRENGTH_COLORS[strength] } }} />
                      <Typography variant="caption" sx={{ color: STRENGTH_COLORS[strength], fontWeight: 500 }}>
                        {STRENGTH_LABELS[strength]}
                      </Typography>
                    </Box>
                  )}

                  <TextField fullWidth label="Confirmer le mot de passe" sx={{ mb: 3 }}
                    type={showConfirm ? 'text' : 'password'}
                    {...register('confirm_password', { required: 'Confirmation requise' })}
                    error={!!errors.confirm_password} helperText={errors.confirm_password?.message}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">
                        <IconButton onClick={() => setShowConfirm(!showConfirm)}>{showConfirm ? <VisibilityOff /> : <Visibility />}</IconButton>
                      </InputAdornment>
                    }}
                  />

                  <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}>
                    {loading ? <CircularProgress size={22} color="inherit" /> : 'Activer mon compte'}
                  </Button>
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
