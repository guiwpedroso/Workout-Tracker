import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "./firebase/config";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Workouts from "./pages/Workouts";
import ActiveWorkout from "./pages/ActiveWorkout";
import History from "./pages/History";
import Evolution from "./pages/Evolution";
import Settings from "./pages/Settings";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState("dashboard");
  const [selectedWorkout, setSelectedWorkout] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (!currentUser) {
        setPage("dashboard");
        setSelectedWorkout(null);
      }
    });

    return () => unsubscribe();
  }, []);

  function startWorkout(workout) {
    setSelectedWorkout(workout);
    setPage("active");
  }

  function finishWorkout() {
    setSelectedWorkout(null);
    setPage("history");
  }

  function navigateTo(newPage) {
    setPage(newPage);
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0b0d10",
          color: "#38bdf8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, sans-serif",
          fontWeight: "700",
        }}
      >
        Carregando...
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <>
      {page === "dashboard" && (
        <Dashboard onNavigate={navigateTo} />
      )}

      {page === "workouts" && (
        <Workouts
          onNavigate={navigateTo}
          onStartWorkout={startWorkout}
        />
      )}

      {page === "active" && selectedWorkout && (
        <ActiveWorkout
          workout={selectedWorkout}
          onNavigate={navigateTo}
          onFinish={finishWorkout}
        />
      )}

      {page === "history" && (
        <History onNavigate={navigateTo} />
      )}

      {page === "evolution" && (
        <Evolution onNavigate={navigateTo} />
      )}

      {page === "settings" && (
        <Settings onNavigate={navigateTo} />
      )}
    </>
  );
}

export default App;