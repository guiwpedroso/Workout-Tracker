import { useEffect, useState } from "react";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";
import "./Workouts.css";

function Workouts({ onNavigate, onStartWorkout }) {
  const [workouts, setWorkouts] = useState([]);

  const [name, setName] = useState("");
  const [exercise, setExercise] = useState("");
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState("");

  const [exercises, setExercises] = useState([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "workouts"),
      where("userId", "==", auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setWorkouts(data);
      },
      (error) => {
        console.error("Erro ao carregar treinos:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  function addExercise() {
    if (!exercise.trim()) {
      alert("Digite o nome do exercício.");
      return;
    }

    const newExercise = {
      name: exercise.trim(),
      sets: Number(sets),
      reps: Number(reps),
      weight: Number(weight) || 0,
    };

    setExercises((current) => [...current, newExercise]);

    setExercise("");
    setSets(3);
    setReps(10);
    setWeight("");
  }

  function removeExercise(index) {
    setExercises((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  async function saveWorkout() {
    if (!name.trim()) {
      alert("Digite o nome do treino.");
      return;
    }

    if (exercises.length === 0) {
      alert("Adicione pelo menos um exercício.");
      return;
    }

    if (!auth.currentUser) {
      alert("Você precisa estar logado.");
      return;
    }

    try {
      await addDoc(collection(db, "workouts"), {
        userId: auth.currentUser.uid,
        name: name.trim(),
        exercises,
        createdAt: new Date(),
      });

      setName("");
      setExercises([]);
      setShowForm(false);
    } catch (error) {
      console.error("Erro ao salvar treino:", error);
      alert("Não foi possível salvar o treino.");
    }
  }

  async function removeWorkout(id) {
    const confirmDelete = window.confirm(
      "Tem certeza que deseja excluir este treino?"
    );

    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "workouts", id));
    } catch (error) {
      console.error("Erro ao excluir treino:", error);
      alert("Não foi possível excluir o treino.");
    }
  }

  return (
    <div className="workouts-page">
      <header className="workouts-header">
        <div>
          <button
            className="back-button"
            onClick={() => onNavigate("dashboard")}
          >
            ← Dashboard
          </button>

          <span className="section-label">
            TREINAMENTO
          </span>

          <h1>Meus Treinos</h1>

          <p>
            Organize seus treinos e acompanhe cada evolução.
          </p>
        </div>

        <button
          className="new-workout-button"
          onClick={() => setShowForm(true)}
        >
          + Novo treino
        </button>
      </header>

      {showForm && (
        <section className="workout-form">
          <div className="form-header">
            <div>
              <span className="section-label">
                NOVO TREINO
              </span>

              <h2>Monte seu treino</h2>
            </div>

            <button
              className="close-button"
              onClick={() => setShowForm(false)}
            >
              ×
            </button>
          </div>

          <div className="form-group">
            <label>Nome do treino</label>

            <input
              type="text"
              placeholder="Ex: Treino A — Peito e Tríceps"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
            />
          </div>

          <div className="exercise-form">
            <h3>Adicionar exercício</h3>

            <div className="form-grid">
              <div className="form-group">
                <label>Exercício</label>

                <input
                  type="text"
                  placeholder="Ex: Supino reto"
                  value={exercise}
                  onChange={(event) =>
                    setExercise(event.target.value)
                  }
                />
              </div>

              <div className="form-group">
                <label>Séries</label>

                <input
                  type="number"
                  min="1"
                  value={sets}
                  onChange={(event) =>
                    setSets(event.target.value)
                  }
                />
              </div>

              <div className="form-group">
                <label>Repetições</label>

                <input
                  type="number"
                  min="1"
                  value={reps}
                  onChange={(event) =>
                    setReps(event.target.value)
                  }
                />
              </div>

              <div className="form-group">
                <label>Carga (kg)</label>

                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="0"
                  value={weight}
                  onChange={(event) =>
                    setWeight(event.target.value)
                  }
                />
              </div>
            </div>

            <button
              className="add-exercise-button"
              onClick={addExercise}
            >
              + Adicionar exercício
            </button>
          </div>

          {exercises.length > 0 && (
            <div className="added-exercises">
              <h3>Exercícios adicionados</h3>

              {exercises.map((item, index) => (
                <div
                  className="added-exercise"
                  key={`${item.name}-${index}`}
                >
                  <div>
                    <strong>{item.name}</strong>

                    <span>
                      {item.sets} séries × {item.reps} reps
                    </span>
                  </div>

                  <div className="exercise-actions">
                    <strong>
                      {item.weight} kg
                    </strong>

                    <button
                      onClick={() =>
                        removeExercise(index)
                      }
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            className="save-workout-button"
            onClick={saveWorkout}
          >
            SALVAR TREINO →
          </button>
        </section>
      )}

      <section className="saved-workouts">
        <div className="section-title">
          <div>
            <span className="section-label">
              SEUS TREINOS
            </span>

            <h2>Treinos salvos</h2>
          </div>

          <span className="workout-count">
            {workouts.length} treino
            {workouts.length !== 1 ? "s" : ""}
          </span>
        </div>

        {workouts.length === 0 ? (
          <div className="empty-state">
            <div>🏋️</div>

            <h3>Nenhum treino criado ainda</h3>

            <p>
              Crie seu primeiro treino e comece a
              acompanhar sua evolução.
            </p>

            <button
              className="new-workout-button"
              onClick={() => setShowForm(true)}
            >
              + Criar primeiro treino
            </button>
          </div>
        ) : (
          <div className="workouts-grid">
            {workouts.map((workout) => (
              <article
                className="workout-item"
                key={workout.id}
              >
                <div className="workout-item-header">
                  <div className="workout-icon">
                    W
                  </div>

                  <button
                    className="delete-button"
                    onClick={() =>
                      removeWorkout(workout.id)
                    }
                  >
                    ×
                  </button>
                </div>

                <span className="section-label">
                  TREINO
                </span>

                <h3>{workout.name}</h3>

                <p>
                  {workout.exercises?.length || 0}{" "}
                  exercícios
                </p>

                <div className="workout-exercises">
                  {workout.exercises
                    ?.slice(0, 4)
                    .map((item, index) => (
                      <div key={index}>
                        <span>{item.name}</span>

                        <strong>
                          {item.sets} × {item.reps}
                        </strong>
                      </div>
                    ))}
                </div>

                <button
                  className="start-workout-button"
                  onClick={() =>
                    onStartWorkout(workout)
                  }
                >
                  COMEÇAR →
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Workouts;