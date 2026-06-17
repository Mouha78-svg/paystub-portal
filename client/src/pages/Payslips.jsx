import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  Box, Grid, Card, CardContent, Typography, Button, MenuItem,
  TextField, Chip, Alert, Skeleton, Pagination, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Tooltip, Collapse,
  Dialog, DialogTitle, DialogContent, CircularProgress
} from '@mui/material';
import {
  DownloadOutlined, SearchOutlined, FilterListOutlined,
  ReceiptLongOutlined, ExpandMoreOutlined, ExpandLessOutlined,
  CalendarMonthOutlined, TrendingUpOutlined,
  VisibilityOutlined, CloseOutlined
} from '@mui/icons-material';

const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function PayslipRow({ p, onDownload, downloading, onPreview, previewing }) {
  const [expanded, setExpanded] = useState(false);
  const fmt = n => new Intl.NumberFormat('fr-SN', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(n);
  const pct = ((1 - p.salaire_net / p.salaire_brut) * 100).toFixed(1);

  return (
    <>
      <TableRow hover sx={{ cursor: 'pointer', '& td': { borderBottom: expanded ? 'none' : undefined } }} onClick={() => setExpanded(!expanded)}>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarMonthOutlined sx={{ color: 'primary.main', fontSize: 18 }} />
            <Box>
              <Typography fontWeight={600} fontSize={14}>{p.mois} {p.annee}</Typography>
              <Typography variant="caption" color="text.secondary">#{p.id}</Typography>
            </Box>
          </Box>
        </TableCell>
        <TableCell>
          <Typography fontWeight={500}>{fmt(p.salaire_brut)}</Typography>
        </TableCell>
        <TableCell>
          <Typography fontWeight={700} color="success.main" sx={{ fontFamily: "'Playfair Display', serif" }}>{fmt(p.salaire_net)}</Typography>
        </TableCell>
        <TableCell>
          <Chip label={`-${pct}%`} size="small" color="warning" variant="outlined" />
        </TableCell>
        <TableCell align="right">
          <Tooltip title="Aperçu du bulletin">
            <span>
              <IconButton size="small" disabled={previewing === p.id}
                onClick={e => { e.stopPropagation(); onPreview(p); }}>
                {previewing === p.id ? <CircularProgress size={16} /> : <VisibilityOutlined fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Télécharger le bulletin">
            <span>
              <IconButton size="small" color="primary" disabled={downloading === p.id}
                onClick={e => { e.stopPropagation(); onDownload(p); }}>
                <DownloadOutlined />
              </IconButton>
            </span>
          </Tooltip>
          <IconButton size="small" onClick={e => { e.stopPropagation(); setExpanded(!expanded); }}>
            {expanded ? <ExpandLessOutlined /> : <ExpandMoreOutlined />}
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={5} sx={{ py: 0 }}>
          <Collapse in={expanded}>
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2, mb: 1 }}>
              <Grid container spacing={2}>
                {[
                  { label: 'Salaire brut', value: fmt(p.salaire_brut), color: 'text.primary' },
                  { label: 'CNSS (5.7%)', value: `− ${fmt(p.salaire_brut * 0.057)}`, color: 'error.main' },
                  { label: 'IPRES (5.6%)', value: `− ${fmt(p.salaire_brut * 0.056)}`, color: 'error.main' },
                  { label: 'Autres retenues', value: `− ${fmt(p.salaire_brut - p.salaire_net - p.salaire_brut * 0.113)}`, color: 'error.main' },
                  { label: 'Net à payer', value: fmt(p.salaire_net), color: 'success.main', serif: true },
                ].map(item => (
                  <Grid item xs={6} sm={4} key={item.label}>
                    <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                    <Typography fontWeight={600} color={item.color} fontSize={14}
                      sx={{ fontFamily: item.serif ? "'Playfair Display', serif" : undefined }}>{item.value}</Typography>
                  </Grid>
                ))}
              </Grid>
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Button variant="outlined" size="small" startIcon={<VisibilityOutlined />}
                  onClick={() => onPreview(p)} disabled={previewing === p.id}>
                  Aperçu
                </Button>
                <Button variant="contained" size="small" startIcon={<DownloadOutlined />}
                  onClick={() => onDownload(p)} disabled={downloading === p.id}>
                  Télécharger le bulletin PDF
                </Button>
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function Payslips() {
  const { user } = useAuth();
  const [rawPayslips, setRawPayslips] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [years, setYears] = useState([]);
  const [filterYear, setFilterYear] = useState('');
  const [filterMois, setFilterMois] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(null);
  const [previewing, setPreviewing] = useState(null);
  const [previewPayslip, setPreviewPayslip] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const fetchPayslips = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10, ...(filterYear && { annee: filterYear }) };
      const { data } = await api.get('/payslips', { params });
      setRawPayslips(data.data || []);
      setTotal(data.total);
      setPages(data.pages);
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const payslips = useMemo(() => {
    let rows = rawPayslips;
    if (filterMois) rows = rows.filter(p => p.mois === filterMois);
    if (search) rows = rows.filter(p =>
      p.mois.toLowerCase().includes(search.toLowerCase()) || String(p.annee).includes(search)
    );
    return rows;
  }, [rawPayslips, filterMois, search]);

  useEffect(() => {
    api.get('/payslips/years').then(r => setYears(r.data)).catch(() => {});
  }, []);

  useEffect(() => { fetchPayslips(); }, [page, filterYear]);

  const handleDownload = async (p) => {
    setDownloading(p.id);
    try {
      const response = await api.get(`/payslips/download/${p.id}`, { responseType: 'blob' });
      const contentType = response.headers['content-type'] || '';
      const ext = contentType.includes('html') ? 'html' : 'pdf';
      const url = URL.createObjectURL(new Blob([response.data], { type: contentType }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bulletin_${p.matricule}_${p.mois}_${p.annee}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('Erreur lors du téléchargement');
    } finally {
      setDownloading(null);
    }
  };

  const handlePreview = async (p) => {
    setPreviewing(p.id);
    setPreviewPayslip(p);
    setPreviewUrl(null);
    try {
      const response = await api.get(`/payslips/download/${p.id}`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      setError("Impossible de charger l'aperçu");
      setPreviewPayslip(null);
    } finally {
      setPreviewing(null);
    }
  };

  const handleClosePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewPayslip(null);
  };

  const fmt = n => new Intl.NumberFormat('fr-SN', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(n);
  const totalNet = payslips.reduce((s, p) => s + p.salaire_net, 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5">Bulletins de salaire</Typography>
          <Typography color="text.secondary">Consultez et téléchargez vos bulletins — {user?.matricule}</Typography>
        </Box>
        <Chip icon={<ReceiptLongOutlined />} label={`${total} bulletin(s) au total`} color="primary" variant="outlined" />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" placeholder="Rechercher…" value={search}
                onChange={e => setSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined fontSize="small" /></InputAdornment> }} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField select fullWidth size="small" label="Année" value={filterYear} onChange={e => { setFilterYear(e.target.value); setPage(1); }}>
                <MenuItem value="">Toutes</MenuItem>
                {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField select fullWidth size="small" label="Mois" value={filterMois} onChange={e => setFilterMois(e.target.value)}>
                <MenuItem value="">Tous</MenuItem>
                {MOIS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button fullWidth variant="outlined" size="small" startIcon={<FilterListOutlined />}
                onClick={() => { setFilterYear(''); setFilterMois(''); setSearch(''); setPage(1); }}>
                Réinitialiser
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Summary stats */}
      {!loading && payslips.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Card sx={{ bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.100' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="caption" color="primary.main" fontWeight={600}>PÉRIODE AFFICHÉE</Typography>
                <Typography fontWeight={700}>{payslips.length} bulletin(s)</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ bgcolor: 'success.50', border: '1px solid', borderColor: 'success.100' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="caption" color="success.main" fontWeight={600}>TOTAL NET AFFICHÉ</Typography>
                <Typography fontWeight={700} color="success.main">{fmt(totalNet)}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 2px 20px rgba(0,0,0,0.08)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#F5EDE3' }}>
              {['Période', 'Brut', 'Net', 'Retenues'].map(h => (
                <TableCell key={h}>
                  <Typography fontWeight={700} fontSize={10} sx={{ letterSpacing: 1.2, textTransform: 'uppercase', color: 'text.secondary' }}>{h}</Typography>
                </TableCell>
              ))}
              <TableCell align="right">
                <Typography fontWeight={700} fontSize={10} sx={{ letterSpacing: 1.2, textTransform: 'uppercase', color: 'text.secondary' }}>Actions</Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              [1,2,3,4,5].map(i => (
                <TableRow key={i}>
                  {[1,2,3,4,5].map(j => <TableCell key={j}><Skeleton /></TableCell>)}
                </TableRow>
              ))
            ) : payslips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <ReceiptLongOutlined sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">Aucun bulletin trouvé</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              payslips.map(p => <PayslipRow key={p.id} p={p} onDownload={handleDownload} downloading={downloading} onPreview={handlePreview} previewing={previewing} />)
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {pages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination count={pages} page={page} onChange={(_, v) => setPage(v)} color="primary" />
        </Box>
      )}

      {/* PDF Preview Dialog */}
      <Dialog open={Boolean(previewPayslip)} onClose={handleClosePreview} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5 }}>
          <Typography fontWeight={600}>
            Aperçu — {previewPayslip?.mois} {previewPayslip?.annee}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              variant="contained" size="small" startIcon={<DownloadOutlined />}
              disabled={!previewUrl}
              onClick={() => { handleClosePreview(); handleDownload(previewPayslip); }}
            >
              Télécharger
            </Button>
            <IconButton size="small" onClick={handleClosePreview}>
              <CloseOutlined />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent
          sx={{
            p: 0, height: '78vh',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: 'grey.100',
          }}
        >
          {!previewUrl ? (
            <CircularProgress />
          ) : (
            <iframe
              src={previewUrl}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="Aperçu bulletin de salaire"
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
