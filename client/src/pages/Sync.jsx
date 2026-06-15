import { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import {
  Box, Card, CardContent, Typography, Alert,
  LinearProgress, Divider, Chip, List, ListItem, ListItemText,
  Paper
} from '@mui/material';
import {
  CheckCircleOutline, WarningAmberOutlined, InfoOutlined,
  AutoStoriesOutlined, HourglassTopOutlined,
} from '@mui/icons-material';

export default function Sync() {
  const [uploading, setUploading] = useState(false);
  const [jobStatus, setJobStatus] = useState(null);   // current polling state
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const bulletinRef = useRef();
  const pollingRef = useRef(null);

  // Clean up polling on unmount
  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

  const stopPolling = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  };

  const pollJob = (jobId) => {
    pollingRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/sync/bulletin-pdf/job/${jobId}`);
        setJobStatus(data);

        if (data.status === 'done' || data.status === 'error') {
          stopPolling();
          setUploading(false);
          if (data.status === 'error') {
            setError(data.errorMessage || 'Erreur lors du traitement');
          } else {
            setResult({
              message: `${data.saved} bulletin(s) enregistré(s) sur ${data.total} page(s) traitée(s)`,
              total: data.total,
              saved: data.saved,
              errors: data.errors || [],
            });
          }
        }
      } catch {
        stopPolling();
        setUploading(false);
        setError('Impossible de vérifier l\'état du traitement');
      }
    }, 1500);
  };

  const handleBulletinUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');
    setResult(null);
    setJobStatus(null);
    setUploading(true);

    const fd = new FormData();
    fd.append('bulletin', file);
    e.target.value = '';

    try {
      const { data } = await api.post('/sync/bulletin-pdf', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      pollJob(data.jobId);
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'envoi du fichier");
      setUploading(false);
    }
  };

  const progressPct = jobStatus?.total > 0
    ? Math.round((jobStatus.progress / jobStatus.total) * 100)
    : null;

  const statusLabel = (() => {
    if (!jobStatus) return 'Envoi du fichier…';
    if (jobStatus.status === 'parsing')    return 'Analyse du PDF en cours…';
    if (jobStatus.status === 'processing') {
      if (jobStatus.total === 0) return 'Chargement…';
      return `Page ${jobStatus.progress} / ${jobStatus.total}`;
    }
    return 'Finalisation…';
  })();

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1 }}>Synchronisation</Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Importez un bulletin PDF multi-pages pour extraire et associer automatiquement chaque page à son employé
      </Typography>

      {/* Format info */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <InfoOutlined color="info" />
            <Typography fontWeight={600}>Format attendu</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Bulletin PDF multi-pages — une page par employé
          </Typography>
          <Paper sx={{ bgcolor: 'grey.900', p: 2, borderRadius: 2, fontFamily: 'monospace', fontSize: 11, color: '#ffb74d', overflow: 'auto' }}>
            {'Un seul fichier PDF contenant plusieurs bulletins (un par page).\n'}
            {'Les salaires sont extraits automatiquement si présents dans le texte.\n\n'}
            {'En-tête détecté automatiquement :\n'}
            {'  Matricule   EMP001\n'}
            {'  Période du  01/06/2025\n\n'}
            {'Montants reconnus (optionnel) :\n'}
            {'  Salaire Brut / Brut Imposable / Total Brut\n'}
            {'  Net à Payer / Net Payé / Net Fiscal'}
          </Paper>
        </CardContent>
      </Card>

      {/* Upload card */}
      <Card sx={{ maxWidth: 520 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AutoStoriesOutlined sx={{ color: 'warning.main' }} />
            <Typography fontWeight={600}>Bulletin PDF multi-pages</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Les fichiers volumineux sont traités en arrière-plan avec suivi de progression en temps réel.
          </Typography>

          <Box
            onClick={() => !uploading && bulletinRef.current.click()}
            sx={{
              border: '2px dashed',
              borderColor: uploading ? 'grey.300' : 'warning.light',
              borderRadius: 3, p: 3, textAlign: 'center',
              cursor: uploading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: uploading ? 0.6 : 1,
              '&:hover': uploading ? {} : { borderColor: 'warning.main', bgcolor: 'warning.50' },
            }}
          >
            <AutoStoriesOutlined sx={{ fontSize: 36, color: 'warning.main', mb: 0.5 }} />
            <Typography fontWeight={500} fontSize={14}>
              {uploading ? 'Traitement en cours…' : 'Choisir un fichier PDF'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {uploading ? 'Veuillez patienter' : '.pdf · taille illimitée'}
            </Typography>
          </Box>
          <input
            ref={bulletinRef}
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={handleBulletinUpload}
          />

          {/* Progress section */}
          {uploading && (
            <Box sx={{ mt: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  {statusLabel}
                </Typography>
                {progressPct !== null && (
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    {progressPct}%
                  </Typography>
                )}
              </Box>
              <LinearProgress
                variant={progressPct !== null ? 'determinate' : 'indeterminate'}
                value={progressPct ?? undefined}
                color="warning"
                sx={{ borderRadius: 4, height: 8 }}
              />
              {(jobStatus?.saved ?? 0) > 0 && (
                <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 1 }}>
                  {jobStatus.saved} bulletin(s) enregistré(s)…
                </Typography>
              )}
              {(jobStatus?.errors?.length ?? 0) > 0 && (
                <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
                  {jobStatus.errors.length} page(s) ignorée(s) jusqu'ici
                </Typography>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mt: 3, maxWidth: 520 }}>{error}</Alert>}

      {/* Result */}
      {result && (
        <Card sx={{ mt: 3, maxWidth: 640, border: '1px solid', borderColor: 'success.300' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <CheckCircleOutline color="success" />
              <Typography fontWeight={600} color="success.main">Synchronisation terminée</Typography>
              <Chip
                label={`${result.saved} / ${result.total} page(s)`}
                color="success" size="small"
              />
            </Box>
            <Typography variant="body2">{result.message}</Typography>

            {result.errors?.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <WarningAmberOutlined color="warning" fontSize="small" />
                  <Typography variant="body2" fontWeight={600}>
                    {result.errors.length} page(s) ignorée(s) ou en erreur
                  </Typography>
                </Box>
                <List dense sx={{ maxHeight: 240, overflow: 'auto' }}>
                  {result.errors.map((e, i) => (
                    <ListItem key={i} sx={{ py: 0 }}>
                      <ListItemText
                        primary={e}
                        primaryTypographyProps={{ fontSize: 12, color: 'warning.dark' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Uploading status summary when there's already a partial result visible */}
      {uploading && jobStatus?.status === 'processing' && jobStatus.total > 0 && (
        <Paper sx={{ mt: 3, maxWidth: 520, p: 2, borderRadius: 3, bgcolor: 'grey.50' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HourglassTopOutlined sx={{ color: 'warning.main', fontSize: 18 }} />
            <Typography variant="body2" fontWeight={500}>
              Traitement en cours — ne fermez pas cette page
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Page {jobStatus.progress} / {jobStatus.total} ·&nbsp;
            {jobStatus.saved} enregistré(s) · {jobStatus.errors.length} ignoré(s)
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
