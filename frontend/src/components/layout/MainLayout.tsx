import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { logout } from "../../features/auth/authSlice";

export function MainLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const token = useAppSelector((state) => state.auth.token);
  const userEmail = useAppSelector((state) => state.auth.user?.email);

  const displayName = userEmail?.split("@")[0] || "User";

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-bold">Event Management</h1>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link to="/events" className="hover:text-slate-600">
              Events
            </Link>
            <Link to="/events/create" className="hover:text-slate-600">
              Create
            </Link>
            <Link to="/my-events" className="hover:text-slate-600">
              My Events
            </Link>
            {token ? (
              <>
                <span className="text-slate-700">{displayName}</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-800"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="rounded-md bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-800"
              >
                Login
              </Link>
            )}
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </section>
    </main>
  );
}
