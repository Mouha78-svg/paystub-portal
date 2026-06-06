import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useForm } from "react-hook-form";
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
  CircularProgress,
} from "@mui/material";
import { BadgeOutlined, EmailOutlined, ArrowBackOutlined } from "@mui/icons-material";

export default function ForgotPassword() {
  const [status, setStatus] = useState(null); // null | 'success' | 'error'
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async ({ matricule, email }) => {
    setStatus(null);
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { matricule, email });
      setStatus("success");
      setMessage(data.message);
    } catch (err) {
      setStatus("error");
      setMessage(err.response?.data?.message || "Une erreur est survenue. Réessayez.");
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
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Box
            sx={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              mx: "auto",
              mb: 2,
              bgcolor: "#fff",
              border: "3px solid #A85C26",
              overflow: "hidden",
            }}
          >
            <Box
              component="img"
              src="/logo.png"
              alt="CROUS Logo"
              sx={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            />
          </Box>
          <Typography variant="h5" sx={{ color: "#fff", fontWeight: 700 }}>
            Portail RH
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.65)", mt: 0.5 }}>
            UGB-CROUS-SL
          </Typography>
        </Box>

        <Card>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              Mot de passe oublié
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Entrez votre matricule et votre adresse email. Un code PIN temporaire vous sera envoyé.
            </Typography>

            {status === "success" && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {message}
              </Alert>
            )}
            {status === "error" && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {message}
              </Alert>
            )}

            {status !== "success" && (
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
                  label="Adresse email"
                  placeholder="votre@email.com"
                  type="email"
                  sx={{ mb: 3 }}
                  {...register("email", {
                    required: "Email requis",
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Email invalide" },
                  })}
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailOutlined sx={{ color: "text.secondary" }} />
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
                  {loading ? <CircularProgress size={22} color="inherit" /> : "Envoyer le code PIN"}
                </Button>
              </Box>
            )}

            <Button
              component={RouterLink}
              to="/login"
              variant="text"
              fullWidth
              size="large"
              startIcon={<ArrowBackOutlined />}
              sx={{ mt: 2 }}
            >
              Retour à la connexion
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
