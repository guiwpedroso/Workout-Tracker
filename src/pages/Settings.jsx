import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";

import { auth, db } from "../firebase/config";
import "./Settings.css";

function Settings({ onNavigate }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [goal, setGoal] = useState("Hipertrofia");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!auth.currentUser) return;

      try {
        setEmail(auth.currentUser.email || "");

        const userRef = doc(
          db,
          "users",
          auth.currentUser.uid
        );

        const snapshot = await getDoc(userRef);

        if (snapshot.exists()) {
          const data = snapshot.data();

          setName(data.name || "");
          setGoal(data.goal || "Hipertrofia");
          setWeight(data.weight || "");
          setHeight(data.height || "");
        } else {
          setName(auth.currentUser.displayName || "");
        }
      } catch (error) {
        console.error(
          "Erro ao carregar configurações:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  async function saveSettings() {
    if (!auth.currentUser) return;

    if (!name.trim()) {
      alert("Digite seu nome.");
      return;
    }

    setSaving(true);

    try {
      await setDoc(
        doc(db, "users", auth.currentUser.uid),
        {
          name: name.trim(),
          email,
          goal,
          weight: Number(weight) || 0,
          height: Number(height) || 0,
          updatedAt: new Date(),
        },
        {
          merge: true,
        }
      );

      alert("Configurações salvas com sucesso!");
    } catch (error) {
      console.error(
        "Erro ao salvar configurações:",
        error
      );

      alert("Não foi possível salvar as configurações.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    const confirmLogout = window.confirm(
      "Tem certeza que deseja sair da sua conta?"
    );

    if (!confirmLogout) return;

    try {
      await signOut(auth);
    } catch (error) {
      console.error("Erro ao sair:", error);
      alert("Não foi possível sair da conta.");
    }
  }

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-loading">
          Carregando configurações...
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <header className="settings-header">
        <button
          className="back-button"
          onClick={() => onNavigate("dashboard")}
        >
          ← Dashboard
        </button>

        <span className="section-label">
          PERFIL
        </span>

        <h1>Configurações</h1>

        <p>
          Personalize seus dados e preferências.
        </p>
      </header>

      <main className="settings-container">
        <section className="settings-card">
          <div className="settings-card-header">
            <div>
              <span className="section-label">
                CONTA
              </span>

              <h2>Informações pessoais</h2>
            </div>

            <div className="settings-avatar">
              {name
                ? name.charAt(0).toUpperCase()
                : "G"}
            </div>
          </div>

          <div className="settings-grid">
            <div className="settings-group">
              <label>Nome</label>

              <input
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
              />
            </div>

            <div className="settings-group">
              <label>E-mail</label>

              <input
                type="email"
                value={email}
                disabled
              />
            </div>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-header">
            <div>
              <span className="section-label">
                PERFIL DE TREINO
              </span>

              <h2>Seus objetivos</h2>
            </div>
          </div>

          <div className="settings-group">
            <label>Objetivo principal</label>

            <select
              value={goal}
              onChange={(event) =>
                setGoal(event.target.value)
              }
            >
              <option value="Hipertrofia">
                Hipertrofia
              </option>

              <option value="Força">
                Força
              </option>

              <option value="Emagrecimento">
                Emagrecimento
              </option>

              <option value="Condicionamento">
                Condicionamento
              </option>

              <option value="Manutenção">
                Manutenção
              </option>
            </select>
          </div>

          <div className="settings-grid">
            <div className="settings-group">
              <label>Peso (kg)</label>

              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="Ex: 70"
                value={weight}
                onChange={(event) =>
                  setWeight(event.target.value)
                }
              />
            </div>

            <div className="settings-group">
              <label>Altura (cm)</label>

              <input
                type="number"
                min="0"
                placeholder="Ex: 177"
                value={height}
                onChange={(event) =>
                  setHeight(event.target.value)
                }
              />
            </div>
          </div>

          <button
            className="save-settings-button"
            onClick={saveSettings}
            disabled={saving}
          >
            {saving
              ? "SALVANDO..."
              : "SALVAR ALTERAÇÕES →"}
          </button>
        </section>

        <section className="settings-card danger-card">
          <div>
            <span className="section-label">
              SESSÃO
            </span>

            <h2>Sair da conta</h2>

            <p>
              Você poderá entrar novamente usando seu
              e-mail e senha.
            </p>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            SAIR DA CONTA
          </button>
        </section>
      </main>
    </div>
  );
}

export default Settings;