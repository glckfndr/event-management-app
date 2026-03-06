import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Link, useNavigate } from "react-router-dom";
import * as yup from "yup";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { registerUser } from "../features/auth/authSlice";
import { Button } from "../components/ui/Button";
import { FormErrorText } from "../components/ui/FormErrorText";
import { FormField } from "../components/ui/FormField";

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
          <FormField
            label="Name"
            htmlFor="name"
            errorMessage={errors.name?.message}
          >
            <input
              id="name"
              type="text"
              className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700 placeholder:text-slate-400"
              placeholder="Your full name"
              {...register("name")}
            />
          </FormField>

          <FormField
            label="Email"
            htmlFor="email"
            errorMessage={errors.email?.message}
          >
            <input
              id="email"
              type="email"
              className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700 placeholder:text-slate-400"
              placeholder="you@example.com"
              {...register("email")}
            />
          </FormField>

          <FormField
            label="Password"
            htmlFor="password"
            errorMessage={errors.password?.message}
          >
            <input
              id="password"
              type="password"
              className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700 placeholder:text-slate-400"
              placeholder="Create a strong password"
              {...register("password")}
            />
          </FormField>

          {submitError ? <FormErrorText>{submitError}</FormErrorText> : null}
          {authState.error ? (
            <FormErrorText>{authState.error}</FormErrorText>
          ) : null}

          <Button
            type="submit"
            disabled={authState.status === "loading"}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-[1.05rem] font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {authState.status === "loading"
              ? "Creating account..."
              : "Create account"}
          </Button>
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
