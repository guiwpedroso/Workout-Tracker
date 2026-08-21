import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/config";
import "./Login.css";

function Login({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }

      onLogin();
    } catch (error) {
      if (error.code === "auth/invalid-credential") {
        setError("E-mail ou senha incorretos.");
      } else if (error.code === "auth/email-already-in-use") {
        setError("Este e-mail já está cadastrado.");
      } else if (error.code === "auth/weak-password") {
        setError("A senha precisa ter pelo menos 6 caracteres.");
      } else if (error.code === "auth/invalid-email") {
        setError("Digite um e-mail válido.");
      } else {
        setError("Ocorreu um erro. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-brand">
          <div className="brand-icon">W</div>
          <span>WORKOUT</span>
        </div>

        <div className="login-card">
          <div className="login-header">
            <span className="section-label">
              {isRegistering ? "COMECE AGORA" : "BEM-VINDO DE VOLTA"}
            </span>

            <h1>
              {isRegistering
                ? "Crie sua conta"
                : "Bora voltar aos treinos?"}
            </h1>

            <p>
              {isRegistering
                ? "Comece a acompanhar sua evolução."
                : "Acompanhe seus treinos e continue evoluindo."}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {isRegistering && (
              <div className="input-group">
                <label>Nome</label>
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>
            )}

            <div className="input-group">
              <label>E-mail</label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label>Senha</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button className="login-button" type="submit" disabled={loading}>
              {loading
                ? "CARREGANDO..."
                : isRegistering
                  ? "CRIAR CONTA →"
                  : "ENTRAR →"}
            </button>
          </form>

          <div className="login-switch">
            <span>
              {isRegistering
                ? "Já possui uma conta?"
                : "Ainda não possui uma conta?"}
            </span>

            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError("");
              }}
            >
              {isRegistering ? "Entrar" : "Criar conta"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;