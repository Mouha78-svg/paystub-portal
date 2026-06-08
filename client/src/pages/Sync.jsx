import { useState, useRef } from 'react';
import api from '../services/api';
import {
  Box, Card, CardContent, Typography, Button, Alert,
  LinearProgress, Divider, Chip, List, ListItem, ListItemText,
  Paper
} from '@mui/material';
import {
  SyncOutlined, UploadFileOutlined, CheckCircleOutline,
  WarningAmberOutlined, InfoOutlined, FolderZipOutlined, PictureAsPdfOutlined,
  AutoStoriesOutlined,
} from '@mui/icons-material';

export default function Sync() {
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [uploadingZip, setUploadingZip] = useState(false);
  const [uploadingPdfs, setUploadingPdfs] = useState(false);
  const [uploadingBulletin, setUploadingBulletin] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef();
  const zipRef = useRef();
  const pdfsRef = useRef();
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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('csv', file);
    await runSync('/sync/csv', fd);
    setUploading(false);
    e.target.value = '';
  };

  const handleLocalSync = async () => {
    setSyncing(true);
    await runSync('/sync/csv', new FormData());
    setSyncing(false);
  };

  const handleZipUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingZip(true);
    const fd = new FormData();
    fd.append('zip', file);
    await runSync('/sync/zip', fd);
    setUploadingZip(false);
    e.target.value = '';
  };

  const handlePdfsUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploadingPdfs(true);
    const fd = new FormData();
    files.forEach(f => fd.append('pdfs', f));
    await runSync('/sync/pdfs', fd);
    setUploadingPdfs(false);
    e.target.value = '';
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
        Importez les bulletins depuis un CSV, une archive ZIP, des fichiers PDF ou le fichier local du serveur
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <InfoOutlined color="info" />
            <Typography fontWeight={600}>Formats attendus</Typography>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Fichier CSV</Typography>
              <Paper sx={{ bgcolor: 'grey.900', p: 2, borderRadius: 2, fontFamily: 'monospace', fontSize: 11, color: '#4caf50', overflow: 'auto' }}>
                {'matricule,nom,prenom,mois,annee,\n'}
                {'salaire_brut,salaire_net,fichier_pdf\n'}
                {'EMP001,Seye,Mouhamed,Janvier,\n'}
                {'2025,500000,420000,EMP001_2025_01.pdf'}
              </Paper>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Archive ZIP (données + PDFs)</Typography>
              <Paper sx={{ bgcolor: 'grey.900', p: 2, borderRadius: 2, fontFamily: 'monospace', fontSize: 11, color: '#64b5f6', overflow: 'auto' }}>
                {'📦 archive.zip\n'}
                {'├── payslips.csv\n'}
                {'├── EMP001_2025_01.pdf\n'}
                {'└── EMP002_2025_01.pdf'}
              </Paper>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Fichiers PDF (nommage requis)</Typography>
              <Paper sx={{ bgcolor: 'grey.900', p: 2, borderRadius: 2, fontFamily: 'monospace', fontSize: 11, color: '#ff8a65', overflow: 'auto' }}>
                {'MATRICULE_ANNEE_MM.pdf\n\n'}
                {'0001_2020_04.pdf\n'}
                {'0003_2020_04.pdf\n'}
                {'EMP001_2025_01.pdf'}
              </Paper>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(5, 1fr)' }, gap: 3, mb: 3 }}>
        {/* CSV Upload */}
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <UploadFileOutlined color="primary" />
              <Typography fontWeight={600}>CSV</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Importez les données de paie. Les PDFs seront générés automatiquement à la demande.
            </Typography>
            <Box onClick={() => fileRef.current.click()} sx={{
              border: '2px dashed', borderColor: 'primary.200', borderRadius: 3, p: 3,
              textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
              '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.50' }
            }}>
              <UploadFileOutlined sx={{ fontSize: 36, color: 'primary.main', mb: 0.5 }} />
              <Typography fontWeight={500} fontSize={14}>Choisir un fichier</Typography>
              <Typography variant="caption" color="text.secondary">.csv uniquement</Typography>
            </Box>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileUpload} />
            {uploading && <LinearProgress sx={{ mt: 2 }} />}
          </CardContent>
        </Card>

        {/* ZIP Upload */}
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <FolderZipOutlined color="success" />
              <Typography fontWeight={600}>Archive ZIP</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              CSV + PDFs originaux en une archive. Les formats des bulletins sont préservés tels quels.
            </Typography>
            <Box onClick={() => zipRef.current.click()} sx={{
              border: '2px dashed', borderColor: 'success.200', borderRadius: 3, p: 3,
              textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
              '&:hover': { borderColor: 'success.main', bgcolor: 'success.50' }
            }}>
              <FolderZipOutlined sx={{ fontSize: 36, color: 'success.main', mb: 0.5 }} />
              <Typography fontWeight={500} fontSize={14}>Choisir une archive</Typography>
              <Typography variant="caption" color="text.secondary">.zip uniquement</Typography>
            </Box>
            <input ref={zipRef} type="file" accept=".zip" style={{ display: 'none' }} onChange={handleZipUpload} />
            {uploadingZip && <LinearProgress color="success" sx={{ mt: 2 }} />}
          </CardContent>
        </Card>

        {/* PDF Upload */}
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <PictureAsPdfOutlined sx={{ color: 'error.main' }} />
              <Typography fontWeight={600}>Fichiers PDF</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Uploadez plusieurs PDFs directement. Nommage requis : <code>MATRICULE_ANNEE_MOIS.pdf</code>
            </Typography>
            <Box onClick={() => pdfsRef.current.click()} sx={{
              border: '2px dashed', borderColor: 'error.200', borderRadius: 3, p: 3,
              textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
              '&:hover': { borderColor: 'error.main', bgcolor: 'error.50' }
            }}>
              <PictureAsPdfOutlined sx={{ fontSize: 36, color: 'error.main', mb: 0.5 }} />
              <Typography fontWeight={500} fontSize={14}>Choisir des PDFs</Typography>
              <Typography variant="caption" color="text.secondary">.pdf — sélection multiple</Typography>
            </Box>
            <input ref={pdfsRef} type="file" accept=".pdf" multiple style={{ display: 'none' }} onChange={handlePdfsUpload} />
            {uploadingPdfs && <LinearProgress color="error" sx={{ mt: 2 }} />}
          </CardContent>
        </Card>

        {/* Bulletin PDF multi-pages */}
        <Card>
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

        {/* Local sync */}
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <SyncOutlined color="secondary" />
              <Typography fontWeight={600}>Local serveur</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Lit et importe le fichier <code>server/csv/payslips.csv</code> directement depuis le serveur.
            </Typography>
            <Box sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 2, mb: 3, fontFamily: 'monospace', fontSize: 11 }}>
              📁 server/csv/payslips.csv
            </Box>
            <Button variant="contained" color="secondary" fullWidth startIcon={<SyncOutlined />}
              onClick={handleLocalSync} disabled={syncing}>
              {syncing ? 'Synchronisation…' : 'Synchroniser'}
            </Button>
            {syncing && <LinearProgress color="secondary" sx={{ mt: 2 }} />}
          </CardContent>
        </Card>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {result && (
        <Card sx={{ border: '1px solid', borderColor: 'success.300' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <CheckCircleOutline color="success" />
              <Typography fontWeight={600} color="success.main">Synchronisation réussie</Typography>
              {result.count != null && (
                <Chip label={`${result.count} bulletin(s)`} color="success" size="small" />
              )}
              {result.saved != null && (
                <Chip label={`${result.saved} / ${result.total} page(s) extraite(s)`} color="success" size="small" />
              )}
              {result.pdfsImported != null && (
                <Chip label={`${result.pdfsImported} PDF(s) importé(s)`} color="info" size="small" />
              )}
              {result.matched != null && (
                <Chip label={`${result.matched} correspondance(s) en base`} color="warning" size="small" />
              )}
            </Box>
            <Typography variant="body2">{result.message}</Typography>
            {result.errors?.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <WarningAmberOutlined color="warning" fontSize="small" />
                  <Typography variant="body2" fontWeight={600}>{result.errors.length} fichier(s) ignoré(s)</Typography>
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
