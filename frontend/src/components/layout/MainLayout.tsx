import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { logout } from "../../features/auth/authSlice";

export function MainLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const token = useAppSelector((state) => state.auth.token);
  const userEmail = useAppSelector((state) => state.auth.user?.email);

  const displayName = userEmail?.split("@")[0] || "User";

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };

  const pathname = location.pathname;

  const isEventsActive =
    pathname === "/events" ||
    (pathname.startsWith("/events/") && pathname !== "/events/create");
  const isCreateActive = pathname === "/events/create";
  const isMyEventsActive = pathname === "/my-events";

  const navItemClass = (isActive: boolean) =>
    isActive
      ? "inline-flex items-center gap-3 rounded-2xl bg-indigo-500 px-5 py-2.5 text-[1.05rem] font-semibold text-white"
      : "inline-flex items-center gap-3 rounded-2xl px-5 py-2.5 text-[1.05rem] font-semibold text-slate-700 hover:bg-slate-100";

  const createLinkClass = (isActive: boolean) =>
    isActive
      ? "inline-flex items-center gap-3 rounded-2xl bg-indigo-500 px-6 py-3 text-[1.05rem] font-semibold text-white"
      : "inline-flex items-center gap-3 rounded-2xl px-6 py-3 text-[1.05rem] font-semibold text-slate-700 hover:bg-slate-100";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-md px-1 py-1 hover:bg-slate-100"
            aria-label="Go to home"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M8 3V6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M16 3V6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <rect
                  x="3"
                  y="5"
                  width="18"
                  height="16"
                  rx="3"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path d="M3 10H21" stroke="currentColor" strokeWidth="2" />
              </svg>
            </span>
            <span className="text-lg font-bold text-slate-900">Evently</span>
          </Link>

          <nav className="flex items-center gap-2">
            <Link to="/events" className={navItemClass(isEventsActive)}>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M5 6H7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M11 6H19"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M5 12H7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M11 12H19"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M5 18H7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M11 18H19"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Events
            </Link>
            <Link to="/my-events" className={navItemClass(isMyEventsActive)}>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M8 3V6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M16 3V6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <rect
                  x="3"
                  y="5"
                  width="18"
                  height="16"
                  rx="3"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path d="M3 10H21" stroke="currentColor" strokeWidth="2" />
              </svg>
              My Events
            </Link>
            <Link
              to="/events/create"
              className={createLinkClass(isCreateActive)}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M12 5V19"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M5 12H19"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Create Event
            </Link>
            {token ? (
              <div className="ml-3 flex items-center gap-3 border-l border-slate-200 pl-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M5 20C5.75 16.95 8.36 15 12 15C15.64 15 18.25 16.95 19 20"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="text-[1.05rem] font-semibold text-slate-800">
                  {displayName}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Logout"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M15 8L19 12L15 16"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M19 12H9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 5H7C5.89543 5 5 5.89543 5 7V17C5 18.1046 5.89543 19 7 19H12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="rounded-xl bg-indigo-600 px-4 py-2 text-[1.05rem] font-semibold text-white hover:bg-indigo-500"
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
