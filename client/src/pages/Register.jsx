import { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import api from "../services/api";
import {
  Box, TextField, Button, Typography, Alert,
  InputAdornment, CircularProgress, MenuItem,
  Select, FormControl, InputLabel, FormHelperText,
} from "@mui/material";
import {
  BadgeOutlined, PersonOutlined, EmailOutlined,
  BusinessOutlined, InfoOutlined, WcOutlined, ArrowBackOutlined,
} from "@mui/icons-material";

const DIAMOND_BG = `url("data:image/svg+xml,%3Csvg width='44' height='44' viewBox='0 0 44 44' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M22 2 L42 22 L22 42 L2 22 Z' fill='none' stroke='%23fff' stroke-opacity='0.06' stroke-width='1'/%3E%3C/svg%3E")`;

const SERVICES = [
  "AGENCE CPTBLE PART",
  "CELLULE ETUDES SUIVI ET PAVE",
  "Cellule Comm et Dialog Social",
  "Cellule de Passation Marchés",
  "Comptabilite des Matiéres",
  "DIRECTION",
  "DIV ANIMATION CULT &SPORTS",
  "DIV DES RESSOURCES HUMAINES",
  "DIVISION ENTRETIEN ET CONSTRUC",
  "DIVISION FINANCIERE",
  "DIVISION HEBERGEMENT",
  "DIVISION TRANSPORT",
  "Division SécuritéEnvironnement",
  "Finance",
  "Informatique",
  "SCE CONTRO INT ET GEST QUALITE",
  "SERVICE ADMINISTRATIF",
  "SERVICE DES RESTAURANTS UNIVER",
  "SERVICE INFORMATIQUE",
  "SERVICE MEDICO-SOCIA ETUDIANTS",
  "SERVICE MEDICO-SOCIAL",
  "Service Hyg Salub et Cont Tick",
];

export default function Register() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, control, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setError("");
    setLoading(true);
    try {
      const { data: res } = await api.post("/auth/register", {
        matricule: data.matricule.trim().toUpperCase(),
        nom: data.nom.trim(),
        prenom: data.prenom.trim(),
        email: data.email.trim().toLowerCase(),
        service: data.service,
        genre: data.genre,
      });
      navigate("/verify-email", {
        state: {
          matricule: data.matricule.trim().toUpperCase(),
          prenom: data.prenom.trim(),
          email: res.email,
        },
      });
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'inscription");
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
            Votre matricule, nom et service doivent correspondre exactement à votre dossier RH.
          </Typography>
        </Box>
      </Box>

      {/* Right form panel */}
      <Box sx={{
        flex: 1, display: "flex", alignItems: { xs: "flex-start", md: "center" },
        justifyContent: "center",
        bgcolor: "background.default",
        p: { xs: 2, sm: 4, md: 7 },
        overflowY: "auto",
      }}>
        <Box sx={{ width: "100%", maxWidth: 480, py: { xs: 2, md: 0 } }}>
          <Typography variant="h5" sx={{ mb: 0.75 }}>Activer mon compte</Typography>
          <Typography color="text.secondary" sx={{ mb: 3, fontSize: 14, lineHeight: 1.7 }}>
            Saisissez vos informations exactement telles qu'elles figurent dans les registres RH.
          </Typography>

          <Alert severity="info" icon={<InfoOutlined />} sx={{ mb: 3, fontSize: 13 }}>
            En cas de doute sur votre matricule ou service, contactez les Ressources Humaines.
          </Alert>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                fullWidth label="Prénom"
                {...register("prenom", { required: "Prénom requis" })}
                error={!!errors.prenom} helperText={errors.prenom?.message}
                InputProps={{
                  startAdornment: <InputAdornment position="start">
                    <PersonOutlined sx={{ color: "text.secondary", fontSize: 20 }} />
                  </InputAdornment>,
                }}
              />
              <TextField
                fullWidth label="Nom"
                {...register("nom", { required: "Nom requis" })}
                error={!!errors.nom} helperText={errors.nom?.message}
              />
            </Box>

            <TextField
              fullWidth label="Matricule" placeholder="EMP004"
              {...register("matricule", {
                required: "Matricule requis",
                pattern: { value: /^[A-Za-z0-9]+$/, message: "Lettres et chiffres uniquement" },
              })}
              error={!!errors.matricule} helperText={errors.matricule?.message}
              InputProps={{
                startAdornment: <InputAdornment position="start">
                  <BadgeOutlined sx={{ color: "text.secondary", fontSize: 20 }} />
                </InputAdornment>,
              }}
            />

            <FormControl fullWidth error={!!errors.service}>
              <InputLabel>Service / Département</InputLabel>
              <Controller
                name="service" control={control}
                rules={{ required: "Service requis" }} defaultValue=""
                render={({ field }) => (
                  <Select {...field} label="Service / Département"
                    startAdornment={
                      <InputAdornment position="start">
                        <BusinessOutlined sx={{ color: "text.secondary", fontSize: 20 }} />
                      </InputAdornment>
                    }>
                    {SERVICES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                )}
              />
              {errors.service && <FormHelperText>{errors.service.message}</FormHelperText>}
            </FormControl>

            <FormControl fullWidth error={!!errors.genre}>
              <InputLabel>Genre</InputLabel>
              <Controller
                name="genre" control={control}
                rules={{ required: "Genre requis" }} defaultValue=""
                render={({ field }) => (
                  <Select {...field} label="Genre"
                    startAdornment={
                      <InputAdornment position="start">
                        <WcOutlined sx={{ color: "text.secondary", fontSize: 20 }} />
                      </InputAdornment>
                    }>
                    <MenuItem value="M">Masculin</MenuItem>
                    <MenuItem value="F">Féminin</MenuItem>
                  </Select>
                )}
              />
              {errors.genre && <FormHelperText>{errors.genre.message}</FormHelperText>}
            </FormControl>

            <TextField
              fullWidth label="Adresse email" type="email"
              {...register("email", {
                required: "Email requis",
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Email invalide" },
              })}
              error={!!errors.email} helperText={errors.email?.message}
              InputProps={{
                startAdornment: <InputAdornment position="start">
                  <EmailOutlined sx={{ color: "text.secondary", fontSize: 20 }} />
                </InputAdornment>,
              }}
            />

            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}>
              {loading ? <CircularProgress size={22} color="inherit" /> : "Vérifier et activer"}
            </Button>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Button
              component={RouterLink} to="/login"
              variant="text" fullWidth startIcon={<ArrowBackOutlined />}
            >
              Retour à la connexion
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
