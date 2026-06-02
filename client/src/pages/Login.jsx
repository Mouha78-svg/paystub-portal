import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Divider,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  BadgeOutlined,
  LockOutlined,
} from "@mui/icons-material";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

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
      setError(err.response?.data?.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #5C2D00 0%, #7D3C00 50%, #A85C26 100%)",
        p: 2,
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Box sx={{ width: 120, height: 120, borderRadius: "50%", overflow: "hidden", mx: "auto", mb: 2, bgcolor: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Box component="img" src="/logo.png" alt="CROUS Logo" sx={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </Box>
          <Typography variant="h5" sx={{ color: "#fff", fontWeight: 700 }}>
            Portail RH
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "rgba(255,255,255,0.65)", mt: 0.5 }}
          >
            UGB-CROUS Sénégal
          </Typography>
        </Box>

        <Card>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              Connexion
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Accédez à vos bulletins de salaire
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
              <TextField
                fullWidth
                label="Matricule"
                placeholder="Ex: EMP001"
                sx={{ mb: 2 }}
                {...register("matricule", { required: "Matricule requis" })}
                error={!!errors.matricule}
                helperText={errors.matricule?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BadgeOutlined sx={{ color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Mot de passe / Code PIN"
                sx={{ mb: 3 }}
                type={showPwd ? "text" : "password"}
                {...register("password", { required: "Mot de passe requis" })}
                error={!!errors.password}
                helperText={errors.password?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlined sx={{ color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPwd(!showPwd)}
                        edge="end"
                      >
                        {showPwd ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
              >
                {loading ? (
                  <CircularProgress size={22} color="inherit" />
                ) : (
                  "Se connecter"
                )}
              </Button>
            </Box>

            <Divider sx={{ my: 3 }} />
            <Alert severity="info" icon={false} sx={{ fontSize: 12 }}>
              <strong>Démo :</strong>
              <br />
              Première connexion: EMP001 / PIN: <strong>1234</strong>
              <br />
              Compte activé: EMP003 / <strong>Admin123!</strong>
            </Alert>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
