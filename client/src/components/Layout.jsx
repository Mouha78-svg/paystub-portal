import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  AppBar, Toolbar, Typography, IconButton, Avatar, Tooltip, Divider,
  Menu, MenuItem, useMediaQuery, useTheme, Chip
} from '@mui/material';
import {
  DashboardOutlined, ReceiptLongOutlined, PersonOutlined,
  MenuOutlined, LogoutOutlined, SyncOutlined, ChevronLeft,
  PeopleOutlined
} from '@mui/icons-material';

const DRAWER_WIDTH = 250;

const BASE_NAV_ITEMS = [
  { label: 'Tableau de bord', icon: <DashboardOutlined />, path: '/dashboard' },
  { label: 'Bulletins de salaire', icon: <ReceiptLongOutlined />, path: '/payslips' },
  { label: 'Mon profil', icon: <PersonOutlined />, path: '/profile' },
  { label: 'Synchronisation', icon: <SyncOutlined />, path: '/sync', adminOnly: true },
  { label: 'Utilisateurs', icon: <PeopleOutlined />, path: '/admin/users', adminOnly: true },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const initials = user ? `${user.prenom[0]}${user.nom[0]}`.toUpperCase() : 'U';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const DrawerContent = () => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #7D3C00 0%, #5C2D00 100%)' }}>
      <Box sx={{ pt: 3, pb: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
          <Box component="img" src="/logo.png" alt="CROUS" sx={{ width: '100%', height: '100%', transform: 'scale(1.22)', objectFit: 'cover' }} />
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>Portail RH</Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>CROUS-SL</Typography>
        </Box>
      </Box>

      <Box sx={{ px: 2, pb: 2 }}>
        <Box sx={{ background: 'rgba(255,255,255,0.1)', borderRadius: 3, p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: '#C68B2E', width: 36, height: 36, fontSize: 14 }}>{initials}</Avatar>
          <Box>
            <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{user?.prenom} {user?.nom}</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{user?.matricule}</Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 1 }} />

      <List sx={{ flex: 1, px: 1 }}>
        {BASE_NAV_ITEMS.filter(item => !item.adminOnly || user?.is_admin).map(item => {
          const active = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => { navigate(item.path); if (isMobile) setMobileOpen(false); }}
                sx={{
                  borderRadius: 2, py: 1.2,
                  background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                  '&:hover': { background: 'rgba(255,255,255,0.1)' },
                  borderLeft: active ? '3px solid #fff' : '3px solid transparent',
                }}
              >
                <ListItemIcon sx={{ color: active ? '#fff' : 'rgba(255,255,255,0.55)', minWidth: 38 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{
                  fontSize: 14, fontWeight: active ? 600 : 400,
                  color: active ? '#fff' : 'rgba(255,255,255,0.7)'
                }} />
                {active && <ChevronLeft sx={{ color: 'rgba(255,255,255,0.5)', transform: 'rotate(180deg)', fontSize: 18 }} />}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
      <Box sx={{ p: 2 }}>
        <ListItemButton onClick={handleLogout} sx={{ borderRadius: 2, py: 1, '&:hover': { background: 'rgba(255,0,0,0.15)' } }}>
          <ListItemIcon sx={{ color: 'rgba(255,100,100,0.8)', minWidth: 38 }}><LogoutOutlined /></ListItemIcon>
          <ListItemText primary="Déconnexion" primaryTypographyProps={{ fontSize: 14, color: 'rgba(255,100,100,0.8)' }} />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Sidebar */}
      {isMobile ? (
        <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH, border: 'none' } }}>
          <DrawerContent />
        </Drawer>
      ) : (
        <Box sx={{ width: DRAWER_WIDTH, flexShrink: 0 }}>
          <Box sx={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: DRAWER_WIDTH }}>
            <DrawerContent />
          </Box>
        </Box>
      )}

      {/* Main */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {isMobile && (
          <AppBar position="sticky" elevation={0} sx={{ bgcolor: '#fff', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Toolbar>
              <IconButton onClick={() => setMobileOpen(true)} edge="start" sx={{ mr: 2 }}>
                <MenuOutlined />
              </IconButton>
              <Typography variant="h6" sx={{ flex: 1, color: 'text.primary', fontSize: 16 }}>Portail RH</Typography>
              <Tooltip title={`${user?.prenom} ${user?.nom}`}>
                <Avatar sx={{ bgcolor: '#7D3C00', width: 36, height: 36, fontSize: 13, cursor: 'pointer' }}
                  onClick={e => setAnchorEl(e.currentTarget)}>{initials}</Avatar>
              </Tooltip>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                <MenuItem onClick={handleLogout}><LogoutOutlined sx={{ mr: 1, fontSize: 18 }} /> Déconnexion</MenuItem>
              </Menu>
            </Toolbar>
          </AppBar>
        )}

        <Box sx={{ flex: 1, p: { xs: 2, md: 4 }, overflow: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
