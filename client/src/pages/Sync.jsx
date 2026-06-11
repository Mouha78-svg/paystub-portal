import { useState, useRef } from 'react';
import api from '../services/api';
import {
  Box, Card, CardContent, Typography, Alert,
  LinearProgress, Divider, Chip, List, ListItem, ListItemText,
  Paper
} from '@mui/material';
import {
  CheckCircleOutline, WarningAmberOutlined, InfoOutlined, AutoStoriesOutlined,
} from '@mui/icons-material';

export default function Sync() {
  const [uploadingBulletin, setUploadingBulletin] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const bulletinRef = useRef();

  const runSync = async (url, formData) => {
    setError(''); setResult(null);
    try {
      const { data } = await api.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(data);
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur de synchronisation');
    }
  };

  const handleBulletinUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingBulletin(true);
    const fd = new FormData();
    fd.append('bulletin', file);
    await runSync('/sync/bulletin-pdf', fd);
    setUploadingBulletin(false);
    e.target.value = '';
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1 }}>Synchronisation</Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Importez un bulletin PDF multi-pages pour extraire et associer automatiquement chaque page à son employé
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <InfoOutlined color="info" />
            <Typography fontWeight={600}>Format attendu</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Bulletin PDF multi-pages</Typography>
            <Paper sx={{ bgcolor: 'grey.900', p: 2, borderRadius: 2, fontFamily: 'monospace', fontSize: 11, color: '#ffb74d', overflow: 'auto' }}>
              {'Un seul fichier PDF contenant plusieurs bulletins (un par page).\n'}
              {'Chaque page est extraite et associée automatiquement à son employé.\n\n'}
              {'En-tête attendu par page :\n'}
              {'  Matricule  EMP001\n'}
              {'  Période du 01/06/2025'}
            </Paper>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ maxWidth: 480 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AutoStoriesOutlined sx={{ color: 'warning.main' }} />
            <Typography fontWeight={600}>Bulletin PDF</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Importez un PDF multi-pages (ex : fichier mensuel complet). Chaque page est extraite et associée automatiquement à son employé.
          </Typography>
          <Box onClick={() => bulletinRef.current.click()} sx={{
            border: '2px dashed', borderColor: 'warning.300', borderRadius: 3, p: 3,
            textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
            '&:hover': { borderColor: 'warning.main', bgcolor: 'warning.50' }
          }}>
            <AutoStoriesOutlined sx={{ fontSize: 36, color: 'warning.main', mb: 0.5 }} />
            <Typography fontWeight={500} fontSize={14}>Choisir un fichier</Typography>
            <Typography variant="caption" color="text.secondary">.pdf — multi-pages</Typography>
          </Box>
          <input ref={bulletinRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleBulletinUpload} />
          {uploadingBulletin && <LinearProgress color="warning" sx={{ mt: 2 }} />}
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}

      {result && (
        <Card sx={{ mt: 3, border: '1px solid', borderColor: 'success.300' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <CheckCircleOutline color="success" />
              <Typography fontWeight={600} color="success.main">Synchronisation réussie</Typography>
              {result.saved != null && (
                <Chip label={`${result.saved} / ${result.total} page(s) extraite(s)`} color="success" size="small" />
              )}
            </Box>
            <Typography variant="body2">{result.message}</Typography>
            {result.errors?.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <WarningAmberOutlined color="warning" fontSize="small" />
                  <Typography variant="body2" fontWeight={600}>{result.errors.length} page(s) ignorée(s)</Typography>
                </Box>
                <List dense>
                  {result.errors.map((e, i) => (
                    <ListItem key={i} sx={{ py: 0 }}>
                      <ListItemText primary={e} primaryTypographyProps={{ fontSize: 12, color: 'warning.dark' }} />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
