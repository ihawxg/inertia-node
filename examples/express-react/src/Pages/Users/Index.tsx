interface User {
  id: number;
  name: string;
  role: string;
}

interface UsersIndexProps {
  appName: string;
  users: User[];
}

export default function UsersIndex({ appName, users }: UsersIndexProps) {
  return (
    <main className="shell">
      <header className="header">
        <div>
          <p className="eyebrow">Express + React</p>
          <h1>{appName}</h1>
        </div>
        <span className="status">Inertia v3</span>
      </header>

      <section className="panel">
        <h2>Users</h2>
        <div className="table">
          {users.map((user) => (
            <div className="row" key={user.id}>
              <span>{user.name}</span>
              <span>{user.role}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
