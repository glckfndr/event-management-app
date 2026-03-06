import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { loginUser } from "../features/auth/authSlice";

type LoginFormValues = {
  email: string;
  password: string;
};

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const authState = useAppSelector((state) => state.auth);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { register, handleSubmit } = useForm<LoginFormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const from =
    (location.state as { from?: string } | undefined)?.from || "/events";

  const onSubmit = handleSubmit(async (values) => {
    try {
      setSubmitError(null);
      await dispatch(loginUser(values)).unwrap();
      navigate(from, { replace: true });
    } catch {
      setSubmitError("Invalid email or password");
    }
  });

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold">Login</h2>
      <p className="mt-2 text-sm text-slate-600">
        Access your account to manage events.
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-1">
          <label className="text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="rounded-lg border border-slate-300 px-3 py-2"
            {...register("email", { required: true })}
          />
        </div>

        <div className="grid gap-1">
          <label className="text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="rounded-lg border border-slate-300 px-3 py-2"
            {...register("password", { required: true })}
          />
        </div>

        {submitError ? (
          <p className="text-sm text-red-600">{submitError}</p>
        ) : null}
        {authState.error ? (
          <p className="text-sm text-red-600">{authState.error}</p>
        ) : null}

        <button
          type="submit"
          disabled={authState.status === "loading"}
          className="w-full rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {authState.status === "loading" ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        No account?{" "}
        <Link to="/register" className="font-medium text-slate-900 underline">
          Register
        </Link>
      </p>
    </div>
  );
}
