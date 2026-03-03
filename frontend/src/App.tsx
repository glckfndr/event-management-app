import { AppLayout } from "./components/layout/AppLayout";
import "./index.css";

function App() {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

  return (
    <AppLayout
      title="Event Management App"
      subtitle="Frontend is connected and ready. Next step: build auth and events pages."
    >
      <div className="mx-auto max-w-3xl">
        <div className="mt-6 rounded-xl bg-slate-100 p-4">
          <p className="text-sm text-slate-500">API URL</p>
          <p className="mt-1 font-medium">{apiUrl}</p>
        </div>

        <div className="mt-8 flex gap-3">
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            Create Event
          </button>
          <button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
            Browse Events
          </button>
        </div>
      </div>
    </AppLayout>
  );
}

export default App;
