import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Link, useNavigate } from "react-router-dom";
import * as yup from "yup";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { registerUser } from "../features/auth/authSlice";

type RegisterFormValues = {
  name: string;
  email: string;
  password: string;
};

const registerSchema: yup.ObjectSchema<RegisterFormValues> = yup
  .object({
    name: yup
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .required("Name is required"),
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

export function RegisterPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const authState = useAppSelector((state) => state.auth);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: yupResolver(registerSchema),
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
    <div className="px-4 py-10 md:py-14">
      <div className="mx-auto mb-4 max-w-2xl">
        <Link
          to="/events"
          className="text-[1.05rem] font-semibold text-slate-600 hover:text-slate-800"
        >
          ← Back to events
        </Link>
      </div>
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-4xl font-bold text-slate-900">Register</h2>
        <p className="mt-3 text-lg text-slate-500">
          Create your account to start organizing events.
        </p>

        <form className="mt-8 grid gap-5" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <label
              className="text-[1.05rem] font-semibold text-slate-800"
              htmlFor="name"
            >
              Name
            </label>
            <input
              id="name"
              type="text"
              className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700 placeholder:text-slate-400"
              placeholder="Your full name"
              {...register("name")}
            />
            {errors.name ? (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            ) : null}
          </div>

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
              className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700 placeholder:text-slate-400"
              placeholder="you@example.com"
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
              className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700 placeholder:text-slate-400"
              placeholder="Create a strong password"
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
            {authState.status === "loading"
              ? "Creating account..."
              : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-[1.05rem] text-slate-600">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-indigo-600 hover:text-indigo-500"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
