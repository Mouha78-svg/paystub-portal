import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    // Numbered shades (50/100/200/300) are referenced throughout the pages for
    // subtle backgrounds and borders. MUI does not generate them automatically
    // for custom colors, so they are defined explicitly here.
    primary: { main: '#7D3C00', light: '#A85C26', dark: '#4E2500', contrastText: '#fff', 50: '#F6EEE6', 100: '#E9D5C2', 200: '#D3AB85' },
    secondary: { main: '#C68B2E', light: '#E4AA4E', dark: '#8B6200', contrastText: '#fff', 50: '#FBF4E7', 100: '#F3E0BE', 200: '#E4C285' },
    info: { main: '#0288d1', light: '#03a9f4', dark: '#01579b', contrastText: '#fff', 50: '#E1F5FE', 100: '#B3E5FC', 200: '#81D4FA' },
    success: { main: '#2e7d32', light: '#4caf50', dark: '#1b5e20', contrastText: '#fff', 50: '#E8F5E9', 100: '#C8E6C9', 300: '#81C784' },
    background: { default: '#f0f2f8', paper: '#ffffff' },
    error: { main: '#c62828' },
  },
  typography: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
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
          boxShadow: '0 4px 15px rgba(125,60,0,0.3)',
          '&:hover': { boxShadow: '0 6px 20px rgba(125,60,0,0.4)' },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: { '& .MuiOutlinedInput-root': { borderRadius: 10 } }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 16, boxShadow: '0 2px 20px rgba(0,0,0,0.08)' }
      }
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 500 } }
    }
  }
});

export default theme;
