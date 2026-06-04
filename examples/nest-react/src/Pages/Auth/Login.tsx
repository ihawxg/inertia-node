import { router, usePage } from "@inertiajs/react";
import type { FormEvent } from "react";

interface LoginPageProps {
  errors: {
    email?: string;
    password?: string;
  };
  flash: {
    success?: string;
  };
}

export default function Login() {
  const { errors, flash } = usePage().props as unknown as LoginPageProps;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    router.post("/login", {
      email: form.get("email"),
      password: form.get("password"),
    });
  }

  return (
    <main className="shell compact">
      <section className="panel auth-panel">
        <p className="eyebrow">NestJS protected starter</p>
        <h1>Sign in</h1>
        {flash.success ? (
          <p className="notice success">{flash.success}</p>
        ) : null}
        <form className="form" onSubmit={submit}>
          <label>
            Email
            <input name="email" defaultValue="ada@example.com" />
          </label>
          {errors.email ? <p className="field-error">{errors.email}</p> : null}
          <label>
            Password
            <input name="password" type="password" defaultValue="password" />
          </label>
          {errors.password ? (
            <p className="field-error">{errors.password}</p>
          ) : null}
          <button type="submit">Continue</button>
        </form>
      </section>
    </main>
  );
}
