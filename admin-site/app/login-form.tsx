"use client";

import { FormEvent, useState } from "react";

export default function LoginForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
      });

      if (!response.ok) {
        const result = (await response.json()) as { message?: string };
        setError(result.message ?? "无法登录，请重试。");
        return;
      }
      window.location.reload();
    } catch {
      setError("连接失败，请检查网络后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <label htmlFor="username">用户名</label>
      <div className="field-wrap">
        <span className="field-icon" aria-hidden="true">@</span>
        <input id="username" name="username" type="text" autoComplete="username" placeholder="请输入用户名" required autoFocus />
      </div>

      <label htmlFor="password">密码</label>
      <div className="field-wrap">
        <span className="field-icon lock-icon" aria-hidden="true">◆</span>
        <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="请输入密码" required />
        <button className="password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "隐藏密码" : "显示密码"}>
          {showPassword ? "隐藏" : "显示"}
        </button>
      </div>

      <div className="form-message" role="alert" aria-live="polite">{error}</div>
      <button className="submit-button" type="submit" disabled={loading}>
        {loading ? <><span className="spinner" /> 正在登录…</> : <>登录 <span aria-hidden="true">→</span></>}
      </button>
    </form>
  );
}
