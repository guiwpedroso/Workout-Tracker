import { useEffect, useState } from "react";
import { addDoc, collection } from "firebase/firestore";

import { auth, db } from "../firebase/config";
import "./ActiveWorkout.css";

function ActiveWorkout({ workout, onNavigate, onFinish }) {
  const [completedSets, setCompletedSets] = useState({});
  const [setWeights, setSetWeights] = useState({});
  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [saving, setSaving] = useState(false);

  // Timer
  useEffect(() => {
    if (!timerRunning) return;

    const interval = setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning]);

  // Define a carga inicial de cada série
  useEffect(() => {
    if (!workout?.exercises) return;

    const initialWeights = {};

    workout.exercises.forEach((exercise, exerciseIndex) => {
      const weight = Number(exercise.weight || 0);
      const totalSets = Number(exercise.sets || 0);

      for (let setIndex = 0; setIndex < totalSets; setIndex++) {
        initialWeights[`${exerciseIndex}-${setIndex}`] = weight;
      }
    });

    setSetWeights(initialWeights);
  }, [workout]);

  function toggleSet(exerciseIndex, setIndex) {
    const key = `${exerciseIndex}-${setIndex}`;

    setCompletedSets((current) => ({
      ...current,
      [key]: !current[key],
    }));

    setSeconds(0);
    setTimerRunning(true);
  }

  function changeWeight(exerciseIndex, setIndex, value) {
    const key = `${exerciseIndex}-${setIndex}`;

    setSetWeights((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function increaseWeight(exerciseIndex, setIndex) {
    const key = `${exerciseIndex}-${setIndex}`;
    const currentWeight = Number(setWeights[key] || 0);

    changeWeight(
      exerciseIndex,
      setIndex,
      Number((currentWeight + 2.5).toFixed(2))
    );
  }

  function decreaseWeight(exerciseIndex, setIndex) {
    const key = `${exerciseIndex}-${setIndex}`;
    const currentWeight = Number(setWeights[key] || 0);

    const newWeight = Math.max(
      0,
      Number((currentWeight - 2.5).toFixed(2))
    );

    changeWeight(exerciseIndex, setIndex, newWeight);
  }

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      secs
    ).padStart(2, "0")}`;
  }

  async function finishWorkout() {
    const completed = Object.values(completedSets).filter(Boolean).length;

    if (completed === 0) {
      alert("Complete pelo menos uma série antes de finalizar.");
      return;
    }

    if (!auth.currentUser) {
      alert("Usuário não autenticado.");
      return;
    }

    setSaving(true);

    try {
      const historyExercises = (workout.exercises || []).map(
        (exercise, exerciseIndex) => {
          const sets = [];
          const totalSets = Number(exercise.sets || 0);

          for (let setIndex = 0; setIndex < totalSets; setIndex++) {
            const key = `${exerciseIndex}-${setIndex}`;

            sets.push({
              setNumber: setIndex + 1,
              reps: Number(exercise.reps || 0),
              weight: Number(setWeights[key] || 0),
              completed: Boolean(completedSets[key]),
            });
          }

          return {
            name: exercise.name,
            sets,
          };
        }
      );

      const totalVolume = historyExercises.reduce(
        (exerciseTotal, exercise) => {
          const exerciseVolume = exercise.sets.reduce(
            (setTotal, set) => {
              if (!set.completed) return setTotal;

              return (
                setTotal +
                Number(set.reps || 0) * Number(set.weight || 0)
              );
            },
            0
          );

          return exerciseTotal + exerciseVolume;
        },
        0
      );

      await addDoc(collection(db, "workoutHistory"), {
        userId: auth.currentUser.uid,
        workoutId: workout.id,
        workoutName: workout.name,
        exercises: historyExercises,
        completedSets: completed,
        totalVolume,
        duration: seconds,
        completedAt: new Date(),
      });

      onFinish();
    } catch (error) {
      console.error("Erro ao salvar histórico:", error);
      alert("Não foi possível salvar o treino no histórico.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="active-workout-page">
      <header className="active-header">
        <button
          className="active-back"
          onClick={() => onNavigate("workouts")}
        >
          ← Voltar
        </button>

        <div className="active-title">
          <span className="section-label">
            TREINO EM ANDAMENTO
          </span>

          <h1>{workout.name}</h1>
        </div>

        <button
          className="finish-button"
          onClick={finishWorkout}
          disabled={saving}
        >
          {saving ? "SALVANDO..." : "FINALIZAR"}
        </button>
      </header>

      <main className="active-content">
        {/* TIMER */}

        <section className="timer-card">
          <div>
            <span className="section-label">DESCANSO</span>

            <h2>{formatTime(seconds)}</h2>
          </div>

          <div className="timer-actions">
            <button
              onClick={() => setTimerRunning(!timerRunning)}
              className="timer-button"
            >
              {timerRunning ? "PAUSAR" : "INICIAR"}
            </button>

            <button
              onClick={() => {
                setSeconds(0);
                setTimerRunning(false);
              }}
              className="reset-timer"
            >
              RESET
            </button>
          </div>
        </section>

        {/* EXERCÍCIOS */}

        <div className="exercise-progress">
          {workout.exercises?.map((exercise, exerciseIndex) => (
            <section
              className="active-exercise"
              key={exerciseIndex}
            >
              <div className="active-exercise-header">
                <div>
                  <span className="exercise-number">
                    {String(exerciseIndex + 1).padStart(2, "0")}
                  </span>

                  <h2>{exercise.name}</h2>

                  <p>
                    {exercise.sets} séries × {exercise.reps} reps
                  </p>
                </div>
              </div>

              <div className="sets-list">
                {Array.from({
                  length: Number(exercise.sets || 0),
                }).map((_, setIndex) => {
                  const key = `${exerciseIndex}-${setIndex}`;
                  const completed = completedSets[key];
                  const weight = setWeights[key] ?? 0;

                  return (
                    <div
                      key={setIndex}
                      className={`set-row ${
                        completed ? "completed" : ""
                      }`}
                    >
                      <div className="set-info">
                        <span className="set-number">
                          Série {setIndex + 1}
                        </span>

                        <span>
                          {exercise.reps} reps
                        </span>
                      </div>

                      <div className="weight-control">
                        <button
                          type="button"
                          onClick={() =>
                            decreaseWeight(
                              exerciseIndex,
                              setIndex
                            )
                          }
                        >
                          −
                        </button>

                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={weight}
                          onChange={(event) =>
                            changeWeight(
                              exerciseIndex,
                              setIndex,
                              event.target.value
                            )
                          }
                        />

                        <span>kg</span>

                        <button
                          type="button"
                          onClick={() =>
                            increaseWeight(
                              exerciseIndex,
                              setIndex
                            )
                          }
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className="set-check"
                        onClick={() =>
                          toggleSet(
                            exerciseIndex,
                            setIndex
                          )
                        }
                      >
                        {completed ? "✓" : "○"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}

export default ActiveWorkout;