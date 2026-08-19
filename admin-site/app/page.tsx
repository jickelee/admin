import { cookies } from "next/headers";
import LoginForm from "./login-form";
import { isAuthenticated } from "./session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const cookieStore = await cookies();
  const authenticated = isAuthenticated(cookieStore.get("anole_session")?.value);

  if (!authenticated) {
    return (
      <main className="login-page">
        <section className="login-brand" aria-label="Anole Loan 平台介绍">
          <div className="brand-mark" aria-hidden="true">A</div>
          <div className="brand-copy">
            <p className="eyebrow">ANOLE LOAN</p>
            <h1>让贷后管理<br />清晰、可追溯。</h1>
            <p className="brand-description">
              面向贷后运营、还款跟踪与合规催收的一体化工作台。
            </p>
          </div>
          <p className="brand-footnote">内部运营平台 · 巴基斯坦时间 PKT（UTC+5）</p>
        </section>

        <section className="login-panel">
          <div className="login-card">
            <div className="mobile-logo"><span>A</span> Anole Loan</div>
            <p className="login-kicker">欢迎回来</p>
            <h2>登录运营工作台</h2>
            <p className="login-subtitle">请输入管理员账号和密码继续。</p>
            <LoginForm />
            <p className="security-note"><span aria-hidden="true">●</span> 安全访问 · 仅限授权人员</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <form action="/api/logout" method="post" className="logout-form">
        <button type="submit" className="logout-button" title="退出登录">退出登录</button>
      </form>
      <iframe className="admin-frame" src="/admin.html" title="Anole Loan 运营后台" />
    </main>
  );
}
