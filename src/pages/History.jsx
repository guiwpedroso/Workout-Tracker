import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";
import "./History.css";

function History({ onNavigate }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "workoutHistory"),
      where("userId", "==", auth.currentUser.uid),
      orderBy("completedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setHistory(data);
      },
      (error) => {
        console.error("Erro ao carregar histórico:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  function formatDate(timestamp) {
    if (!timestamp) return "Data desconhecida";

    const date = timestamp.toDate
      ? timestamp.toDate()
      : new Date(timestamp);

    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);

    if (minutes === 0) {
      return `${seconds}s`;
    }

    return `${minutes} min`;
  }

  return (
    <div className="history-page">
      <header className="history-header">
        <div>
          <button
            className="back-button"
            onClick={() => onNavigate("dashboard")}
          >
            ← Dashboard
          </button>

          <span className="section-label">ATIVIDADE</span>

          <h1>Histórico</h1>

          <p>
            Veja todos os treinos que você já realizou.
          </p>
        </div>
      </header>

      <main className="history-content">
        <div className="history-summary">
          <div>
            <span>TREINOS REALIZADOS</span>
            <strong>{history.length}</strong>
          </div>

          <div>
            <span>VOLUME TOTAL</span>

            <strong>
              {history
                .reduce(
                  (total, workout) =>
                    total + Number(workout.totalVolume || 0),
                  0
                )
                .toLocaleString("pt-BR")}{" "}
              kg
            </strong>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="history-empty">
            <div>📋</div>

            <h2>Nenhum treino finalizado</h2>

            <p>
              Finalize seu primeiro treino para começar a
              construir seu histórico.
            </p>

            <button
              className="history-button"
              onClick={() => onNavigate("workouts")}
            >
              IR PARA TREINOS →
            </button>
          </div>
        ) : (
          <div className="history-list-page">
            {history.map((workout) => (
              <article
                className="history-card"
                key={workout.id}
              >
                <div className="history-card-main">
                  <div className="history-icon">
                    ✓
                  </div>

                  <div>
                    <span className="section-label">
                      TREINO FINALIZADO
                    </span>

                    <h2>{workout.workoutName}</h2>

                    <p>
                      {formatDate(workout.completedAt)}
                    </p>
                  </div>
                </div>

                <div className="history-metrics">
                  <div>
                    <span>SÉRIES</span>
                    <strong>
                      {workout.completedSets}
                    </strong>
                  </div>

                  <div>
                    <span>VOLUME</span>
                    <strong>
                      {Number(
                        workout.totalVolume || 0
                      ).toLocaleString("pt-BR")}{" "}
                      kg
                    </strong>
                  </div>

                  <div>
                    <span>DURAÇÃO</span>
                    <strong>
                      {formatDuration(
                        workout.duration || 0
                      )}
                    </strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default History;