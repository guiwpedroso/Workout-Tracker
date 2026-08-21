import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { auth, db } from "../firebase/config";
import "./Evolution.css";

function Evolution({ onNavigate }) {
  const [history, setHistory] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "workoutHistory"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setHistory(data);
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao carregar evolução:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  function getDate(workout) {
    if (workout.completedAt?.toDate) {
      return workout.completedAt.toDate();
    }

    if (workout.completedAt) {
      const date = new Date(workout.completedAt);

      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }

    return new Date();
  }

  function getExerciseSets(exercise) {
    // Formato novo
    if (Array.isArray(exercise?.sets)) {
      return exercise.sets.map((set, index) => ({
        setNumber: index + 1,
        reps: Number(set?.reps || 0),
        weight: Number(set?.weight || 0),
        completed:
          !Object.prototype.hasOwnProperty.call(
            set || {},
            "completed"
          ) || Boolean(set.completed),
      }));
    }

    // Formato antigo
    const sets = Number(exercise?.sets || 0);
    const reps = Number(exercise?.reps || 0);
    const weight = Number(exercise?.weight || 0);

    if (sets <= 0) {
      return [];
    }

    return Array.from({ length: sets }, (_, index) => ({
      setNumber: index + 1,
      reps,
      weight,
      completed: true,
    }));
  }

  const exercises = useMemo(() => {
    const names = new Set();

    history.forEach((workout) => {
      if (!Array.isArray(workout.exercises)) return;

      workout.exercises.forEach((exercise) => {
        if (exercise?.name) {
          names.add(exercise.name);
        }
      });
    });

    return Array.from(names);
  }, [history]);

  useEffect(() => {
    if (
      exercises.length > 0 &&
      !exercises.includes(selectedExercise)
    ) {
      setSelectedExercise(exercises[0]);
    }
  }, [exercises, selectedExercise]);

  const evolutionData = useMemo(() => {
    if (!selectedExercise) return [];

    const data = [];

    history.forEach((workout) => {
      if (!Array.isArray(workout.exercises)) return;

      const exercise = workout.exercises.find(
        (item) => item?.name === selectedExercise
      );

      if (!exercise) return;

      const date = getDate(workout);
      const sets = getExerciseSets(exercise);

      sets.forEach((set) => {
        if (!set.completed) return;
        if (set.weight <= 0) return;

        data.push({
          date,
          weight: set.weight,
          reps: set.reps,
          volume: set.weight * set.reps,
        });
      });
    });

    return data.sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );
  }, [history, selectedExercise]);

  const maxWeight = Math.max(
    ...evolutionData.map((item) => item.weight),
    0
  );

  const totalVolume = evolutionData.reduce(
    (total, item) => total + item.volume,
    0
  );

  const firstWeight = evolutionData[0]?.weight || 0;

  const lastWeight =
    evolutionData[evolutionData.length - 1]?.weight || 0;

  const growth =
    firstWeight > 0
      ? Math.round(
          ((lastWeight - firstWeight) / firstWeight) * 100
        )
      : 0;

  function formatDate(date) {
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className="evolution-page">
        <div className="evolution-empty">
          <div className="empty-icon">📈</div>
          <h2>Carregando evolução...</h2>
          <p>Aguarde enquanto buscamos seus treinos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="evolution-page">
      <header className="evolution-header">
        <div>
          <button
            className="back-button"
            onClick={() => onNavigate("dashboard")}
          >
            ← Dashboard
          </button>

          <span className="section-label">
            PERFORMANCE
          </span>

          <h1>Evolução</h1>

          <p>
            Acompanhe sua evolução de carga ao longo dos
            treinos.
          </p>
        </div>

        {exercises.length > 0 && (
          <div className="exercise-selector">
            <label>EXERCÍCIO</label>

            <select
              value={selectedExercise}
              onChange={(event) =>
                setSelectedExercise(event.target.value)
              }
            >
              {exercises.map((exercise) => (
                <option key={exercise} value={exercise}>
                  {exercise}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      {history.length === 0 ? (
        <main className="evolution-empty">
          <div className="empty-icon">📈</div>

          <h2>Sem dados de evolução</h2>

          <p>
            Finalize alguns treinos para começar a
            acompanhar sua evolução.
          </p>

          <button
            className="evolution-button"
            onClick={() => onNavigate("workouts")}
          >
            IR PARA TREINOS →
          </button>
        </main>
      ) : exercises.length === 0 ? (
        <main className="evolution-empty">
          <div className="empty-icon">🏋️</div>

          <h2>Nenhum exercício encontrado</h2>

          <p>
            Seus treinos ainda não possuem exercícios
            registrados.
          </p>
        </main>
      ) : evolutionData.length === 0 ? (
        <main className="evolution-empty">
          <div className="empty-icon">🏋️</div>

          <h2>Exercício sem histórico</h2>

          <p>
            Ainda não existem séries concluídas para esse
            exercício.
          </p>
        </main>
      ) : (
        <main className="evolution-content">
          <section className="evolution-stats">
            <div className="evolution-stat">
              <span>MAIOR CARGA</span>
              <strong>{maxWeight} kg</strong>
            </div>

            <div className="evolution-stat">
              <span>VOLUME</span>
              <strong>
                {totalVolume.toLocaleString("pt-BR")} kg
              </strong>
            </div>

            <div className="evolution-stat">
              <span>EVOLUÇÃO</span>

              <strong
                className={
                  growth >= 0 ? "positive" : "negative"
                }
              >
                {growth >= 0 ? "+" : ""}
                {growth}%
              </strong>
            </div>

            <div className="evolution-stat">
              <span>SÉRIES</span>
              <strong>{evolutionData.length}</strong>
            </div>
          </section>

          <section className="chart-card">
            <div className="chart-header">
              <div>
                <span className="section-label">
                  EVOLUÇÃO DE CARGA
                </span>

                <h2>{selectedExercise}</h2>
              </div>

              <strong className="current-weight">
                {lastWeight} kg
              </strong>
            </div>

            <div className="real-chart">
              <div className="chart-y">
                <span>{maxWeight} kg</span>

                <span>
                  {Math.round(maxWeight * 0.75)} kg
                </span>

                <span>
                  {Math.round(maxWeight * 0.5)} kg
                </span>

                <span>
                  {Math.round(maxWeight * 0.25)} kg
                </span>

                <span>0 kg</span>
              </div>

              <div className="chart-area">
                <div className="grid-lines">
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>

                <div className="chart-points">
                  {evolutionData.map((item, index) => {
                    const percentage =
                      maxWeight > 0
                        ? (item.weight / maxWeight) * 100
                        : 0;

                    return (
                      <div
                        className="point-wrapper"
                        key={`${item.date.getTime()}-${index}`}
                      >
                        <div
                          className="chart-point"
                          style={{
                            bottom: `${percentage}%`,
                          }}
                          title={`${item.weight} kg`}
                        ></div>

                        <span>
                          {formatDate(item.date)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="records-card">
            <div className="section-header">
              <div>
                <span className="section-label">
                  HISTÓRICO DE CARGAS
                </span>

                <h2>Últimas séries</h2>
              </div>
            </div>

            <div className="records-list">
              {[...evolutionData]
                .reverse()
                .slice(0, 10)
                .map((item, index) => (
                  <div
                    className="record-item"
                    key={`${item.date.getTime()}-${index}`}
                  >
                    <div>
                      <strong>
                        {formatDate(item.date)}
                      </strong>

                      <span>
                        {item.reps} repetições
                      </span>
                    </div>

                    <div className="record-right">
                      <strong>
                        {item.weight} kg
                      </strong>

                      <span>
                        {item.volume.toLocaleString(
                          "pt-BR"
                        )}{" "}
                        kg volume
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        </main>
      )}
    </div>
  );
}

export default Evolution;