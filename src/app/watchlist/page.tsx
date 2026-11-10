import {
  setAccountEnabled,
  setAccountTag,
  setAllAccountsEnabled,
} from "@/app/actions";
import { listAccounts } from "@/lib/queries";

function formatLastPost(unix: number | null): string {
  if (!unix) return "—";
  return new Date(unix * 1000).toLocaleDateString("en-GB", {
    timeZone: "Europe/Copenhagen",
  });
}

export default function WatchlistPage() {
  const accounts = listAccounts();

  return (
    <>
      <div className="page-head">
        <h1>Watchlist</h1>
      </div>
      <div className="watch-actions">
        <form
          action={async () => {
            "use server";
            await setAllAccountsEnabled(1);
          }}
        >
          <button type="submit">Enable all</button>
        </form>
        <form
          action={async () => {
            "use server";
            await setAllAccountsEnabled(0);
          }}
        >
          <button type="submit">Disable all</button>
        </form>
      </div>
      {accounts.length === 0 ? (
        <p className="empty">
          No accounts yet. Run <code>npm run import-following</code> after login.
        </p>
      ) : (
        <table className="watch-table">
          <thead>
            <tr>
              <th>On</th>
              <th>Username</th>
              <th>Name</th>
              <th>Tag</th>
              <th>Last post</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id}>
                <td>
                  <form
                    action={async () => {
                      "use server";
                      await setAccountEnabled(
                        account.id,
                        account.enabled ? 0 : 1,
                      );
                    }}
                  >
                    <button type="submit">
                      {account.enabled ? "On" : "Off"}
                    </button>
                  </form>
                </td>
                <td>@{account.username}</td>
                <td>{account.full_name || "—"}</td>
                <td>
                  <form
                    action={async (formData) => {
                      "use server";
                      await setAccountTag(
                        account.id,
                        String(formData.get("tag") ?? ""),
                      );
                    }}
                  >
                    <input
                      className="tag-input"
                      name="tag"
                      defaultValue={account.tag ?? ""}
                      placeholder="tag"
                    />
                    <button type="submit">Save</button>
                  </form>
                </td>
                <td>{formatLastPost(account.last_post_at)}</td>
                <td>
                  {account.last_error ? (
                    <span className="error-text" title={account.last_error}>
                      {account.last_error.slice(0, 60)}
                      {account.last_error.length > 60 ? "…" : ""}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
