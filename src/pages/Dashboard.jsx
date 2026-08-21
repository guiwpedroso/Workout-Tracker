import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";
import "./Dashboard.css";

function Dashboard({ onNavigate }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "workoutHistory"),
      where("userId", "==", auth.currentUser.uid)
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
        console.error("Erro ao carregar dashboard:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  function getWorkoutDate(workout) {
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

  function getWorkoutVolume(workout) {
    if (workout.totalVolume) {
      return Number(workout.totalVolume);
    }

    if (!Array.isArray(workout.exercises)) {
      return 0;
    }

    let volume = 0;

    workout.exercises.forEach((exercise) => {
      if (Array.isArray(exercise.sets)) {
        exercise.sets.forEach((set) => {
          if (
            Object.prototype.hasOwnProperty.call(set, "completed") &&
            !set.completed
          ) {
            return;
          }

          volume +=
            Number(set.weight || 0) *
            Number(set.reps || 0);
        });

        return;
      }

      volume +=
        Number(exercise.sets || 0) *
        Number(exercise.reps || 0) *
        Number(exercise.weight || 0);
    });

    return volume;
  }

  const workoutsThisMonth = useMemo(() => {
    const now = new Date();

    return history.filter((workout) => {
      const date = getWorkoutDate(workout);

      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    }).length;
  }, [history]);

  const totalVolume = useMemo(() => {
    return history.reduce(
      (total, workout) => total + getWorkoutVolume(workout),
      0
    );
  }, [history]);

  const exerciseStats = useMemo(() => {
    const stats = {};

    history.forEach((workout) => {
      if (!Array.isArray(workout.exercises)) {
        return;
      }

      workout.exercises.forEach((exercise) => {
        const name = exercise?.name;

        if (!name) return;

        if (!stats[name]) {
          stats[name] = {
            name,
            maxWeight: 0,
          };
        }

        if (Array.isArray(exercise.sets)) {
          exercise.sets.forEach((set) => {
            if (
              Object.prototype.hasOwnProperty.call(set, "completed") &&
              !set.completed
            ) {
              return;
            }

            const weight = Number(set.weight || 0);

            if (weight > stats[name].maxWeight) {
              stats[name].maxWeight = weight;
            }
          });

          return;
        }

        const weight = Number(exercise.weight || 0);

        if (weight > stats[name].maxWeight) {
          stats[name].maxWeight = weight;
        }
      });
    });

    return Object.values(stats);
  }, [history]);

  const personalRecords = exerciseStats.filter(
    (exercise) => exercise.maxWeight > 0
  ).length;

  const featuredExercise = useMemo(() => {
    if (exerciseStats.length === 0) {
      return {
        name: "Nenhum exercício",
        maxWeight: 0,
        growth: 0,
        history: [],
      };
    }

    const exercise = [...exerciseStats].sort(
      (a, b) => b.maxWeight - a.maxWeight
    )[0];

    const weights = [];

    history.forEach((workout) => {
      if (!Array.isArray(workout.exercises)) return;

      workout.exercises.forEach((item) => {
        if (item?.name !== exercise.name) return;

        if (Array.isArray(item.sets)) {
          item.sets.forEach((set) => {
            if (
              Object.prototype.hasOwnProperty.call(set, "completed") &&
              !set.completed
            ) {
              return;
            }

            const weight = Number(set.weight || 0);

            if (weight > 0) {
              weights.push({
                weight,
                date: getWorkoutDate(workout),
              });
            }
          });
        } else {
          const weight = Number(item.weight || 0);

          if (weight > 0) {
            weights.push({
              weight,
              date: getWorkoutDate(workout),
            });
          }
        }
      });
    });

    weights.sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    const firstWeight = weights[0]?.weight || 0;
    const lastWeight =
      weights[weights.length - 1]?.weight || 0;

    const growth =
      firstWeight > 0
        ? Math.round(
            ((lastWeight - firstWeight) / firstWeight) * 100
          )
        : 0;

    return {
      name: exercise.name,
      maxWeight: exercise.maxWeight,
      growth,
      history: weights,
    };
  }, [exerciseStats, history]);

  const streak = useMemo(() => {
    if (history.length === 0) return 0;

    const dates = [
      ...new Set(
        history.map((workout) => {
          const date = getWorkoutDate(workout);
          return date.toLocaleDateString("en-CA");
        })
      ),
    ]
      .map((date) => new Date(`${date}T00:00:00`))
      .sort((a, b) => b - a);

    if (dates.length === 0) return 0;

    let currentStreak = 1;

    for (let i = 0; i < dates.length - 1; i++) {
      const difference = Math.round(
        (dates[i] - dates[i + 1]) /
          (1000 * 60 * 60 * 24)
      );

      if (difference === 1) {
        currentStreak++;
      } else {
        break;
      }
    }

    return currentStreak;
  }, [history]);

  const recentWorkouts = useMemo(() => {
    return [...history]
      .sort(
        (a, b) =>
          getWorkoutDate(b) - getWorkoutDate(a)
      )
      .slice(0, 4);
  }, [history]);

  function formatDate(workout) {
    const date = getWorkoutDate(workout);
    const today = new Date();

    if (date.toDateString() === today.toDateString()) {
      return "Hoje";
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (
      date.toDateString() === yesterday.toDateString()
    ) {
      return "Ontem";
    }

    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  }

  function formatTime(workout) {
    return getWorkoutDate(workout).toLocaleTimeString(
      "pt-BR",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  function formatVolume(volume) {
    return `${Number(volume || 0).toLocaleString(
      "pt-BR"
    )} kg`;
  }

  function getChartHeight(weight) {
    if (!featuredExercise.maxWeight) return 0;

    return Math.max(
      8,
      (weight / featuredExercise.maxWeight) * 100
    );
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="logo">
          <img
            src="/logo-wourkout.png"
            alt="Workout"
            className="logo-image"
          />

          <span className="logo-text">WORKOUT</span>
        </div>

        <nav>
          <button
            className="nav-item active"
            onClick={() => onNavigate("dashboard")}
          >
            <span>⌂</span>
            Dashboard
          </button>

          <button
            className="nav-item"
            onClick={() => onNavigate("workouts")}
          >
            <span>🏋</span>
            Treinos
          </button>

          <button
            className="nav-item"
            onClick={() => onNavigate("evolution")}
          >
            <span>📈</span>
            Evolução
          </button>

          <button
            className="nav-item"
            onClick={() => onNavigate("history")}
          >
            <span>🕘</span>
            Histórico
          </button>
        </nav>

        <div className="sidebar-bottom">
          <button
            className="nav-item"
            onClick={() => onNavigate("settings")}
          >
            <span>⚙</span>
            Configurações
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="greeting">Boa tarde 👋</p>
            <h1>Bora treinar, Guilherme?</h1>
          </div>

          <div className="profile">
            <div className="avatar">G</div>

            <div>
              <strong>Guilherme</strong>
              <span>Atleta</span>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="dashboard-loading">
            Carregando seus dados...
          </div>
        ) : (
          <>
            <section className="stats">
              <div className="stat-card">
                <span>🔥</span>
                <div>
                  <p>Sequência</p>
                  <h2>{streak} dias</h2>
                </div>
              </div>

              <div className="stat-card">
                <span>🏋️</span>
                <div>
                  <p>Treinos este mês</p>
                  <h2>{workoutsThisMonth}</h2>
                </div>
              </div>

              <div className="stat-card">
                <span>📊</span>
                <div>
                  <p>Volume total</p>
                  <h2>
                    {Number(totalVolume).toLocaleString(
                      "pt-BR"
                    )}{" "}
                    kg
                  </h2>
                </div>
              </div>

              <div className="stat-card">
                <span>🏆</span>
                <div>
                  <p>Exercícios registrados</p>
                  <h2>{personalRecords}</h2>
                </div>
              </div>
            </section>

            <section className="dashboard-grid">
              <div className="workout-card">
                <div className="section-header">
                  <div>
                    <span className="section-label">
                      {recentWorkouts.length > 0
                        ? "ÚLTIMO TREINO"
                        : "COMECE AGORA"}
                    </span>

                    <h2>
                      {recentWorkouts.length > 0
                        ? recentWorkouts[0].workoutName ||
                          recentWorkouts[0].name ||
                          "Treino"
                        : "Nenhum treino realizado"}
                    </h2>
                  </div>

                  <span className="workout-number">
                    {recentWorkouts.length > 0 ? "✓" : "A"}
                  </span>
                </div>

                {recentWorkouts.length > 0 ? (
                  <div className="exercise-list">
                    {recentWorkouts[0].exercises
                      ?.slice(0, 3)
                      .map((exercise, index) => {
                        let weight = 0;
                        let seriesText = "";

                        if (Array.isArray(exercise.sets)) {
                          const completedSets =
                            exercise.sets.filter(
                              (set) =>
                                !Object.prototype.hasOwnProperty.call(
                                  set,
                                  "completed"
                                ) ||
                                set.completed
                            );

                          weight = Math.max(
                            ...completedSets.map((set) =>
                              Number(set.weight || 0)
                            ),
                            0
                          );

                          seriesText = `${completedSets.length} séries`;
                        } else {
                          weight = Number(
                            exercise.weight || 0
                          );

                          seriesText = `${exercise.sets || 0} séries × ${
                            exercise.reps || 0
                          } reps`;
                        }

                        return (
                          <div
                            className="exercise"
                            key={index}
                          >
                            <div>
                              <strong>
                                {exercise.name}
                              </strong>

                              <span>
                                {seriesText}
                              </span>
                            </div>

                            <b>{weight} kg</b>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="dashboard-empty-text">
                    Faça seu primeiro treino para começar
                    a acompanhar sua evolução.
                  </p>
                )}

                <button
                  className="start-button"
                  onClick={() => onNavigate("workouts")}
                >
                  {recentWorkouts.length > 0
                    ? "COMEÇAR NOVO TREINO →"
                    : "COMEÇAR TREINO →"}
                </button>
              </div>

              <div className="progress-card">
                <div className="section-header">
                  <div>
                    <span className="section-label">
                      EVOLUÇÃO
                    </span>

                    <h2>{featuredExercise.name}</h2>
                  </div>

                  <span className="growth">
                    {featuredExercise.growth >= 0 ? "+" : ""}
                    {featuredExercise.growth}%
                  </span>
                </div>

                {featuredExercise.history.length > 0 ? (
                  <div className="dashboard-chart">
                    <div className="chart-y-labels">
                      <span>
                        {featuredExercise.maxWeight} kg
                      </span>

                      <span>
                        {Math.round(
                          featuredExercise.maxWeight * 0.75
                        )}{" "}
                        kg
                      </span>

                      <span>
                        {Math.round(
                          featuredExercise.maxWeight * 0.5
                        )}{" "}
                        kg
                      </span>

                      <span>0 kg</span>
                    </div>

                    <div className="chart-main">
                      <div className="chart-grid">
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>

                      <div className="chart-bars">
                        {featuredExercise.history
                          .slice(-8)
                          .map((item, index) => (
                            <div
                              className="chart-bar-wrapper"
                              key={`${item.date.getTime()}-${index}`}
                            >
                              <div
                                className="chart-bar"
                                style={{
                                  height: `${getChartHeight(
                                    item.weight
                                  )}%`,
                                }}
                                title={`${item.weight} kg`}
                              ></div>

                              <span>
                                {item.date.toLocaleDateString(
                                  "pt-BR",
                                  {
                                    day: "2-digit",
                                    month: "2-digit",
                                  }
                                )}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="chart-empty">
                    <span>📈</span>
                    <p>
                      Complete alguns treinos para ver sua
                      evolução.
                    </p>
                  </div>
                )}

                <div className="progress-footer">
                  <div>
                    <span>MAIOR CARGA</span>

                    <strong>
                      {featuredExercise.maxWeight} kg
                    </strong>
                  </div>

                  <button
                    className="see-all"
                    onClick={() => onNavigate("evolution")}
                  >
                    Ver evolução →
                  </button>
                </div>
              </div>
            </section>

            <section className="recent-section">
              <div className="section-header">
                <div>
                  <span className="section-label">
                    ATIVIDADE
                  </span>

                  <h2>Últimos treinos</h2>
                </div>

                <button
                  className="see-all"
                  onClick={() => onNavigate("history")}
                >
                  Ver todos →
                </button>
              </div>

              {recentWorkouts.length === 0 ? (
                <div className="dashboard-empty">
                  Nenhum treino registrado ainda.
                </div>
              ) : (
                <div className="history-list">
                  {recentWorkouts.map((workout, index) => (
                    <div
                      className="history-item"
                      key={workout.id}
                    >
                      <div className="history-icon">
                        {index === 0
                          ? "💪"
                          : index === 1
                          ? "🏋️"
                          : "🦵"}
                      </div>

                      <div className="history-info">
                        <strong>
                          {workout.workoutName ||
                            workout.name ||
                            "Treino"}
                        </strong>

                        <span>
                          {formatDate(workout)} •{" "}
                          {formatTime(workout)}
                        </span>
                      </div>

                      <strong>
                        {formatVolume(
                          getWorkoutVolume(workout)
                        )}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default Dashboard;