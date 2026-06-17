import { useState } from "react";
import { useNavigate, useLocation, Link as RouterLink } from "react-router-dom";
import api from "../services/api";
import {
  Box, TextField, Button, Typography, Alert,
  CircularProgress, Link, InputAdornment,
} from "@mui/material";
import { MarkEmailReadOutlined, KeyOutlined } from "@mui/icons-material";

const DIAMOND_BG = `url("data:image/svg+xml,%3Csvg width='44' height='44' viewBox='0 0 44 44' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M22 2 L42 22 L22 42 L2 22 Z' fill='none' stroke='%23fff' stroke-opacity='0.06' stroke-width='1'/%3E%3C/svg%3E")`;

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
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.default" }}>
        <Alert severity="error">
          Session invalide.{" "}
          <Link component={RouterLink} to="/register">Recommencer l'inscription</Link>
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
      const { data } = await api.post("/auth/verify-registration", { matricule, code: code.trim() });
      setSuccess(data);
    } catch (err) {
      setError(err.response?.data?.message || "Code incorrect ou expiré");
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
            Vérifiez votre boîte de réception et saisissez le code à 6 chiffres reçu.
          </Typography>
        </Box>
      </Box>

      {/* Right panel */}
      <Box sx={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        bgcolor: "background.default", p: { xs: 2, sm: 4, md: 7 },
      }}>
        <Box sx={{ width: "100%", maxWidth: 400 }}>
          {success ? (
            <Box sx={{ textAlign: "center" }}>
              <MarkEmailReadOutlined sx={{ fontSize: 64, color: "success.main", mb: 2 }} />
              <Typography variant="h5" sx={{ mb: 1 }}>Compte activé !</Typography>
              <Typography color="text.secondary" sx={{ mb: 4, fontSize: 14, lineHeight: 1.7 }}>
                Bonjour <strong>{prenom}</strong>, notez votre code PIN temporaire ci-dessous.
                Vous devrez le saisir lors de votre première connexion.
              </Typography>
              <Alert severity="warning" sx={{ mb: 4, textAlign: "left" }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Matricule :</strong> {success.matricule}
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Mot de passe temporaire :</strong>
                </Typography>
                <Box component="span" sx={{
                  fontFamily: "monospace", fontSize: 20, fontWeight: "bold",
                  letterSpacing: 3, color: "warning.dark", display: "block", mb: 0.5,
                }}>
                  {success.pin}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Vous définirez un nouveau mot de passe lors de la première connexion.
                </Typography>
              </Alert>
              <Button variant="contained" fullWidth size="large" onClick={() => navigate("/login")}>
                Se connecter
              </Button>
            </Box>
          ) : (
            <>
              <Typography variant="h5" sx={{ mb: 0.75 }}>Vérification de l'email</Typography>
              <Typography color="text.secondary" sx={{ mb: 4, fontSize: 14, lineHeight: 1.7 }}>
                Un code à 6 chiffres a été envoyé à <strong>{email}</strong>.
                Entrez-le ci-dessous pour finaliser votre inscription.
              </Typography>

              {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

              <Box component="form" onSubmit={handleVerify} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField
                  fullWidth label="Code de vérification" placeholder="123456"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputProps={{ inputMode: "numeric", maxLength: 6 }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">
                      <KeyOutlined sx={{ color: "text.secondary", fontSize: 20 }} />
                    </InputAdornment>,
                  }}
                />
                <Button type="submit" variant="contained" fullWidth size="large"
                  disabled={loading || code.length !== 6}>
                  {loading ? <CircularProgress size={22} color="inherit" /> : "Vérifier"}
                </Button>
              </Box>

              <Box sx={{ mt: 2, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  Code non reçu ?{" "}
                  <Link component={RouterLink} to="/register" underline="hover">Recommencer</Link>
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
