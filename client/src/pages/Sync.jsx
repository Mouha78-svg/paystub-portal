import { useState, useRef } from 'react';
import api from '../services/api';
import {
  Box, Card, CardContent, Typography, Button, Alert,
  LinearProgress, Divider, Chip, List, ListItem, ListItemText,
  Paper
} from '@mui/material';
import { SyncOutlined, UploadFileOutlined, CheckCircleOutline, WarningAmberOutlined, InfoOutlined } from '@mui/icons-material';

export default function Sync() {
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const runSync = async (formData) => {
    setError(''); setResult(null);
    try {
      const { data } = await api.post('/sync/csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(data);
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur de synchronisation');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('csv', file);
    await runSync(fd);
    setUploading(false);
    e.target.value = '';
  };

  const handleLocalSync = async () => {
    setSyncing(true);
    await runSync(new FormData());
    setSyncing(false);
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1 }}>Synchronisation CSV</Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>Importez les bulletins depuis un fichier CSV local ou uploadé</Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <InfoOutlined color="info" />
            <Typography fontWeight={600}>Format CSV attendu</Typography>
          </Box>
          <Paper sx={{ bgcolor: 'grey.900', p: 2, borderRadius: 2, fontFamily: 'monospace', fontSize: 12, color: '#4caf50', overflow: 'auto' }}>
            {'matricule,nom,prenom,mois,annee,salaire_brut,salaire_net,fichier_pdf\n'}
            {'EMP001,Seye,Mouhamed,Janvier,2025,500000,420000,EMP001_2025_01.pdf\n'}
            {'EMP001,Seye,Mouhamed,Février,2025,500000,420000,EMP001_2025_02.pdf'}
          </Paper>
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
        {/* Upload */}
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <UploadFileOutlined color="primary" />
              <Typography fontWeight={600}>Upload d'un fichier CSV</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Sélectionnez un fichier CSV depuis votre ordinateur pour l'importer directement.
            </Typography>
            <Box onClick={() => fileRef.current.click()} sx={{
              border: '2px dashed', borderColor: 'primary.200', borderRadius: 3, p: 4,
              textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
              '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.50' }
            }}>
              <UploadFileOutlined sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography fontWeight={500}>Cliquez pour choisir un fichier</Typography>
              <Typography variant="caption" color="text.secondary">Fichiers .csv uniquement</Typography>
            </Box>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileUpload} />
            {uploading && <LinearProgress sx={{ mt: 2 }} />}
          </CardContent>
        </Card>

        {/* Local sync */}
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <SyncOutlined color="secondary" />
              <Typography fontWeight={600}>Synchronisation locale</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Lit et importe le fichier <code>server/csv/payslips.csv</code> directement depuis le serveur.
            </Typography>
            <Box sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 2, mb: 3, fontFamily: 'monospace', fontSize: 12 }}>
              📁 server/csv/payslips.csv
            </Box>
            <Button variant="contained" color="secondary" fullWidth startIcon={<SyncOutlined />}
              onClick={handleLocalSync} disabled={syncing}>
              {syncing ? 'Synchronisation…' : 'Synchroniser maintenant'}
            </Button>
            {syncing && <LinearProgress color="secondary" sx={{ mt: 2 }} />}
          </CardContent>
        </Card>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {result && (
        <Card sx={{ border: '1px solid', borderColor: 'success.300' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CheckCircleOutline color="success" />
              <Typography fontWeight={600} color="success.main">Synchronisation réussie</Typography>
              <Chip label={`${result.count} bulletin(s)`} color="success" size="small" />
            </Box>
            <Typography variant="body2">{result.message}</Typography>
            {result.errors?.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <WarningAmberOutlined color="warning" fontSize="small" />
                  <Typography variant="body2" fontWeight={600}>{result.errors.length} ligne(s) ignorée(s)</Typography>
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
