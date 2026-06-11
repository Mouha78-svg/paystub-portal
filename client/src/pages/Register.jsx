import { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
  Link,
} from "@mui/material";
import {
  BadgeOutlined,
  PersonOutlined,
  EmailOutlined,
  BusinessOutlined,
  InfoOutlined,
  WcOutlined,
} from "@mui/icons-material";

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
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm();

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
      <Box sx={{ width: "100%", maxWidth: 480 }}>
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
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              Activer mon compte
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Saisissez vos informations exactement telles qu'elles figurent dans
              les registres RH.
            </Typography>

            <Alert severity="info" icon={<InfoOutlined />} sx={{ mb: 3, fontSize: 13 }}>
              Votre matricule, nom, prénom et service doivent correspondre à votre
              dossier. En cas de doute, contactez les Ressources Humaines.
            </Alert>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
              {/* Row: prenom + nom */}
              <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                <TextField
                  fullWidth
                  label="Prénom"
                  {...register("prenom", { required: "Prénom requis" })}
                  error={!!errors.prenom}
                  helperText={errors.prenom?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutlined sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  fullWidth
                  label="Nom"
                  {...register("nom", { required: "Nom requis" })}
                  error={!!errors.nom}
                  helperText={errors.nom?.message}
                />
              </Box>

              <TextField
                fullWidth
                label="Matricule"
                placeholder="Ex: EMP004"
                sx={{ mb: 2 }}
                {...register("matricule", {
                  required: "Matricule requis",
                  pattern: {
                    value: /^[A-Za-z0-9]+$/,
                    message: "Matricule invalide (lettres et chiffres uniquement)",
                  },
                })}
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

              <FormControl fullWidth error={!!errors.service} sx={{ mb: 2 }}>
                <InputLabel>Service / Département</InputLabel>
                <Controller
                  name="service"
                  control={control}
                  rules={{ required: "Service requis" }}
                  defaultValue=""
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="Service / Département"
                      startAdornment={
                        <InputAdornment position="start">
                          <BusinessOutlined sx={{ color: "text.secondary" }} />
                        </InputAdornment>
                      }
                    >
                      {SERVICES.map((s) => (
                        <MenuItem key={s} value={s}>
                          {s}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
                {errors.service && (
                  <FormHelperText>{errors.service.message}</FormHelperText>
                )}
              </FormControl>

              <FormControl fullWidth error={!!errors.genre} sx={{ mb: 2 }}>
                <InputLabel>Genre</InputLabel>
                <Controller
                  name="genre"
                  control={control}
                  rules={{ required: "Genre requis" }}
                  defaultValue=""
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="Genre"
                      startAdornment={
                        <InputAdornment position="start">
                          <WcOutlined sx={{ color: "text.secondary" }} />
                        </InputAdornment>
                      }
                    >
                      <MenuItem value="M">Masculin</MenuItem>
                      <MenuItem value="F">Féminin</MenuItem>
                    </Select>
                  )}
                />
                {errors.genre && (
                  <FormHelperText>{errors.genre.message}</FormHelperText>
                )}
              </FormControl>

              <TextField
                fullWidth
                label="Adresse email"
                type="email"
                sx={{ mb: 3 }}
                {...register("email", {
                  required: "Email requis",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Email invalide",
                  },
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
                {loading ? (
                  <CircularProgress size={22} color="inherit" />
                ) : (
                  "Vérifier et activer"
                )}
              </Button>
            </Box>

            <Box sx={{ mt: 2, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Vous avez déjà un compte ?{" "}
                <Link component={RouterLink} to="/login" underline="hover">
                  Se connecter
                </Link>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
