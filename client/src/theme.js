import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#7D3C00', light: '#A85C26', dark: '#4E2500', contrastText: '#fff' },
    secondary: { main: '#C68B2E', light: '#E4AA4E', dark: '#8B6200', contrastText: '#fff' },
    background: { default: '#FAF6F0', paper: '#FFFDF9' },
    text: { primary: '#2C1A0E', secondary: '#7A5840' },
    success: { main: '#2e7d32' },
    error: { main: '#c62828' },
    divider: '#EDE3D6',
  },
  typography: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    h4: { fontWeight: 700, fontFamily: "'Playfair Display', serif" },
    h5: { fontWeight: 700, fontFamily: "'Playfair Display', serif" },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10, padding: '10px 22px' },
        containedPrimary: {
          background: 'linear-gradient(135deg, #7D3C00 0%, #A85C26 100%)',
          boxShadow: '0 2px 8px rgba(125,60,0,0.22)',
          '&:hover': {
            background: 'linear-gradient(135deg, #6A3200 0%, #964E20 100%)',
            boxShadow: '0 4px 14px rgba(125,60,0,0.32)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: { '& .MuiOutlinedInput-root': { borderRadius: 10 } },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 1px 3px rgba(44,26,14,0.06), 0 4px 16px rgba(44,26,14,0.07)',
          border: '1px solid #EDE3D6',
          background: '#FFFDF9',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { background: '#FFFDF9' },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 500 } },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: '#EDE3D6' } },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottomColor: '#EDE3D6' },
      },
    },
  },
});

export default theme;
