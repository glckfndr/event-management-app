import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { registerUser } from "../features/auth/authSlice";

type RegisterFormValues = {
  name: string;
  email: string;
  password: string;
};

export function RegisterPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const authState = useAppSelector((state) => state.auth);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { register, handleSubmit } = useForm<RegisterFormValues>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      setSubmitError(null);
      await dispatch(registerUser(values)).unwrap();
      navigate("/login");
    } catch {
      setSubmitError("Registration failed. Try another email.");
    }
  });

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold">Register</h2>
      <p className="mt-2 text-sm text-slate-600">
        Create your account to start organizing events.
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-1">
          <label className="text-sm font-medium" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            type="text"
            className="rounded-lg border border-slate-300 px-3 py-2"
            {...register("name", { required: true })}
          />
        </div>

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
            {...register("password", { required: true, minLength: 8 })}
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
          {authState.status === "loading"
            ? "Creating account..."
            : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-slate-900 underline">
          Login
        </Link>
      </p>
    </div>
  );
}
