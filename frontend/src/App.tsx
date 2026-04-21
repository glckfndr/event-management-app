import { useEffect } from "react";
import { AppRouterProvider } from "./app/router";
import { useAppDispatch } from "./app/hooks";
import { fetchSession } from "./features/auth/authSlice";

function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    void dispatch(fetchSession());
  }, [dispatch]);

  return <AppRouterProvider />;
}

export default App;
