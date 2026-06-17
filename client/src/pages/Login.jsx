import { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import {
  Box, TextField, Button, Typography, Alert,
  InputAdornment, IconButton, CircularProgress,
} from "@mui/material";
import {
  Visibility, VisibilityOff, BadgeOutlined, LockOutlined,
  PersonAddOutlined, LockResetOutlined,
} from "@mui/icons-material";

const DIAMOND_BG = `url("data:image/svg+xml,%3Csvg width='44' height='44' viewBox='0 0 44 44' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M22 2 L42 22 L22 42 L2 22 Z' fill='none' stroke='%23fff' stroke-opacity='0.06' stroke-width='1'/%3E%3C/svg%3E")`;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async ({ matricule, password }) => {
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { matricule, password });
      if (data.first_login) {
        navigate("/first-login", { state: { matricule, token: data.token } });
      } else {
        login(data.token, data.employee);
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Identifiants incorrects");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: { xs: "column", md: "row" } }}>
      {/* Left branding panel */}
      <Box sx={{
        width: { xs: "100%", md: "38%" },
        minHeight: { xs: 200, md: "100vh" },
        bgcolor: "#3D1A00",
        backgroundImage: DIAMOND_BG,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        p: { xs: 3, md: 6 },
        position: { md: "sticky" }, top: 0, maxHeight: { md: "100vh" },
      }}>
        <Box sx={{
          width: { xs: 72, md: 100 }, height: { xs: 72, md: 100 },
          borderRadius: "50%", bgcolor: "rgba(255,255,255,0.1)",
          overflow: "hidden", mb: { xs: 2, md: 3 }, flexShrink: 0,
        }}>
          <Box component="img" src="/logo.png" alt="CROUS"
            sx={{ width: "100%", height: "100%", objectFit: "contain", p: 1, display: "block" }} />
        </Box>

        <Typography sx={{
          color: "#fff", fontWeight: 700,
          fontSize: { xs: 22, md: 28 },
          fontFamily: "'Playfair Display', serif",
          textAlign: "center", lineHeight: 1.2, mb: 1,
        }}>
          Portail RH
        </Typography>

        <Typography sx={{
          color: "rgba(255,255,255,0.4)", fontSize: 11,
          letterSpacing: 2.5, textTransform: "uppercase", textAlign: "center",
        }}>
          UGB — CROUS — Sénégal
        </Typography>

        <Box sx={{ mt: 5, maxWidth: 240, display: { xs: "none", md: "block" } }}>
          <Typography sx={{
            color: "rgba(255,255,255,0.28)", fontSize: 13,
            textAlign: "center", lineHeight: 2,
          }}>
            Consultez et téléchargez vos bulletins de salaire en toute sécurité.
          </Typography>
        </Box>
      </Box>

      {/* Right form panel */}
      <Box sx={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        bgcolor: "background.default", p: { xs: 2, sm: 4, md: 7 },
      }}>
        <Box sx={{ width: "100%", maxWidth: 400 }}>
          <Typography variant="h5" sx={{ mb: 0.75 }}>Connexion</Typography>
          <Typography color="text.secondary" sx={{ mb: 4, fontSize: 14, lineHeight: 1.7 }}>
            Saisissez vos identifiants pour accéder à votre espace
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth label="Matricule" placeholder="EMP001"
              {...register("matricule", { required: "Matricule requis" })}
              error={!!errors.matricule} helperText={errors.matricule?.message}
              InputProps={{
                startAdornment: <InputAdornment position="start">
                  <BadgeOutlined sx={{ color: "text.secondary", fontSize: 20 }} />
                </InputAdornment>,
              }}
            />
            <TextField
              fullWidth label="Mot de passe / Code PIN"
              type={showPwd ? "text" : "password"}
              {...register("password", { required: "Mot de passe requis" })}
              error={!!errors.password} helperText={errors.password?.message}
              InputProps={{
                startAdornment: <InputAdornment position="start">
                  <LockOutlined sx={{ color: "text.secondary", fontSize: 20 }} />
                </InputAdornment>,
                endAdornment: <InputAdornment position="end">
                  <IconButton onClick={() => setShowPwd(!showPwd)} edge="end">
                    {showPwd ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>,
              }}
            />
            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}>
              {loading ? <CircularProgress size={22} color="inherit" /> : "Se connecter"}
            </Button>
          </Box>

          <Box sx={{ mt: 2.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Button
              component={RouterLink} to="/register"
              variant="outlined" fullWidth size="large"
              startIcon={<PersonAddOutlined />}
            >
              Créer un compte
            </Button>
            <Button
              component={RouterLink} to="/forgot-password"
              variant="text" fullWidth
              startIcon={<LockResetOutlined />}
            >
              Mot de passe oublié ?
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
