import { Deferred, router, usePage } from "@inertiajs/react";

interface Activity {
  id: number;
  message: string;
}

interface DashboardProps {
  auth: {
    user: {
      id: number;
      name: string;
      email: string;
    };
  };
  flash: {
    success?: string;
  };
  stats?: {
    users: number;
    activity: number;
  };
  activity: {
    data: Activity[];
  };
}

export default function Dashboard() {
  const { auth, flash, activity } = usePage()
    .props as unknown as DashboardProps;

  return (
    <main className="shell">
      <header className="header">
        <div>
          <p className="eyebrow">Full-stack Node</p>
          <h1>Welcome, {auth.user.name}</h1>
        </div>
        <button className="secondary" onClick={() => router.post("/logout")}>
          Log out
        </button>
      </header>

      {flash.success ? <p className="notice success">{flash.success}</p> : null}

      <section className="panel">
        <h2>Deferred stats</h2>
        <Deferred
          data="stats"
          fallback={<p className="muted">Loading stats...</p>}
        >
          <Stats />
        </Deferred>
      </section>

      <section className="panel">
        <h2>Mergeable activity</h2>
        <div className="table">
          {activity.data.map((item) => (
            <div className="row" key={item.id}>
              <span>{item.message}</span>
              <span>#{item.id}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Stats() {
  const { stats } = usePage().props as unknown as DashboardProps;

  if (!stats) {
    return null;
  }

  return (
    <div className="stats-grid">
      <div>
        <strong>{stats.users}</strong>
        <span>Users</span>
      </div>
      <div>
        <strong>{stats.activity}</strong>
        <span>Events</span>
      </div>
    </div>
  );
}
