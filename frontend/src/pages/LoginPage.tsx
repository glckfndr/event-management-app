import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Link, useLocation, useNavigate } from "react-router-dom";
import * as yup from "yup";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { loginUser } from "../features/auth/authSlice";

type LoginFormValues = {
  email: string;
  password: string;
};

const loginSchema: yup.ObjectSchema<LoginFormValues> = yup
  .object({
    email: yup
      .string()
      .trim()
      .email("Enter a valid email")
      .required("Email is required"),
    password: yup
      .string()
      .min(8, "Password must be at least 8 characters")
      .required("Password is required"),
  })
  .required();

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const authState = useAppSelector((state) => state.auth);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: yupResolver(loginSchema),
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
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="text-4xl font-bold text-slate-900">Login</h2>
      <p className="mt-3 text-lg text-slate-500">
        Access your account to manage events.
      </p>

      <form className="mt-8 grid gap-5" onSubmit={onSubmit}>
        <div className="grid gap-2">
          <label
            className="text-[1.05rem] font-semibold text-slate-800"
            htmlFor="email"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700"
            {...register("email")}
          />
          {errors.email ? (
            <p className="text-sm text-red-600">{errors.email.message}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <label
            className="text-[1.05rem] font-semibold text-slate-800"
            htmlFor="password"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700"
            {...register("password")}
          />
          {errors.password ? (
            <p className="text-sm text-red-600">{errors.password.message}</p>
          ) : null}
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
          className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-[1.05rem] font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {authState.status === "loading" ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-5 text-[1.05rem] text-slate-600">
        No account?{" "}
        <Link
          to="/register"
          className="font-semibold text-indigo-600 hover:text-indigo-500"
        >
          Register
        </Link>
      </p>
    </div>
  );
}
