import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  Box, Grid, Card, CardContent, Typography, Button, Chip,
  Avatar, Skeleton, Alert, Divider
} from '@mui/material';
import {
  ReceiptLongOutlined, PersonOutlined, TrendingUpOutlined,
  ArrowForwardOutlined, AccountBalanceOutlined, CalendarMonthOutlined
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/payslips?limit=3').then(r => setPayslips(r.data.data || [])).catch(e => setError(e.response?.data?.message || 'Erreur')).finally(() => setLoading(false));
  }, []);

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
              <StatCard icon={<ReceiptLongOutlined />} label="Bulletins" value={loading ? '—' : payslips.length >= 3 ? '3+' : payslips.length} color="primary" loading={loading} />
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
    </Box>
  );
}
