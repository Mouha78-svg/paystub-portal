import { useState } from "react";
import { useNavigate, useLocation, Link as RouterLink } from "react-router-dom";
import api from "../services/api";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link,
  InputAdornment,
} from "@mui/material";
import { MarkEmailReadOutlined, KeyOutlined } from "@mui/icons-material";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { matricule, prenom, email } = state || {};

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  if (!matricule) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Alert severity="error">
          Session invalide.{" "}
          <Link component={RouterLink} to="/register">
            Recommencer l'inscription
          </Link>
        </Alert>
      </Box>
    );
  }

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/verify-registration", {
        matricule,
        code: code.trim(),
      });
      setSuccess(data);
    } catch (err) {
      setError(err.response?.data?.message || "Code incorrect ou expiré");
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
          <Box
            sx={{
              width: 100,
              height: 100,
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
              sx={{ width: "100%", height: "100%", objectFit: "contain" }}
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
            {success ? (
              <Box sx={{ textAlign: "center" }}>
                <MarkEmailReadOutlined sx={{ fontSize: 56, color: "success.main", mb: 2 }} />
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Compte créé avec succès !
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Bonjour <strong>{prenom}</strong>, notez votre mot de passe
                  temporaire ci-dessous avant de vous connecter.
                </Typography>
                <Alert severity="warning" sx={{ mb: 3, textAlign: "left" }}>
                  <strong>Matricule :</strong> {success.matricule}
                  <br />
                  <strong>Mot de passe temporaire :</strong>{" "}
                  <Box
                    component="span"
                    sx={{
                      fontFamily: "monospace",
                      fontSize: 18,
                      fontWeight: "bold",
                      letterSpacing: 2,
                      color: "warning.dark",
                    }}
                  >
                    {success.pin}
                  </Box>
                  <br />
                  <Typography
                    component="span"
                    sx={{ fontSize: 11, color: "text.secondary", display: "block", mt: 0.5 }}
                  >
                    Vous devrez définir un nouveau mot de passe lors de la première connexion.
                  </Typography>
                </Alert>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={() => navigate("/login")}
                >
                  Se connecter
                </Button>
              </Box>
            ) : (
              <>
                <Typography variant="h6" sx={{ mb: 0.5 }}>
                  Vérification de l'email
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Un code à 6 chiffres a été envoyé à <strong>{email}</strong>.
                  Entrez-le ci-dessous pour finaliser votre inscription.
                </Typography>

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                <Box component="form" onSubmit={handleVerify}>
                  <TextField
                    fullWidth
                    label="Code de vérification"
                    placeholder="123456"
                    sx={{ mb: 3 }}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputProps={{ inputMode: "numeric", maxLength: 6 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <KeyOutlined sx={{ color: "text.secondary" }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    size="large"
                    disabled={loading || code.length !== 6}
                  >
                    {loading ? (
                      <CircularProgress size={22} color="inherit" />
                    ) : (
                      "Vérifier"
                    )}
                  </Button>
                </Box>

                <Box sx={{ mt: 2, textAlign: "center" }}>
                  <Typography variant="body2" color="text.secondary">
                    Code non reçu ?{" "}
                    <Link component={RouterLink} to="/register" underline="hover">
                      Recommencer
                    </Link>
                  </Typography>
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
