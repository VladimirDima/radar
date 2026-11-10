import type { ItemView } from "@/lib/types";
import { setItemFlag } from "@/app/actions";

function formatWhen(item: ItemView): string {
  if (item.kind === "opportunity" && item.deadline) {
    return `Deadline ${item.deadline.replace("T", " ")}`;
  }
  const start = item.starts_at?.replace("T", " ");
  const end = item.ends_at?.replace("T", " ");
  if (start && end) return `${start} → ${end}`;
  if (start) return start;
  if (item.deadline) return `Deadline ${item.deadline.replace("T", " ")}`;
  return "Date unknown";
}

function hasDate(item: ItemView): boolean {
  return Boolean(item.starts_at || item.deadline);
}

function categoryLabel(category: string): string {
  return category.replace(/_/g, " ");
}

export function ItemList({ items }: { items: ItemView[] }) {
  if (items.length === 0) {
    return <p className="empty">Nothing here yet.</p>;
  }

  return (
    <div className="item-grid">
      {items.map((item) => (
        <article
          key={item.id}
          className={`item-card${item.seen ? "" : " unseen"}`}
        >
          {item.image_file ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="cover"
              src={`/img/${item.image_file}`}
              alt=""
              width={120}
              height={120}
            />
          ) : (
            <div className="cover placeholder">No image</div>
          )}
          <div className="item-body">
            <div className="item-meta">
              <span className={`cat cat-${item.category}`}>
                {categoryLabel(item.category)}
              </span>
              <span className="item-user">@{item.username}</span>
            </div>
            <h2 className="item-title">{item.title}</h2>
            <p className="item-summary">{item.summary}</p>
            <p className="item-when">{formatWhen(item)}</p>
            {(item.venue || item.city) && (
              <p className="item-place">
                {[item.venue, item.city].filter(Boolean).join(" · ")}
              </p>
            )}
            {item.price ? <p className="item-price">{item.price}</p> : null}
            <div className="item-actions">
              <a
                className="btn"
                href={item.permalink}
                target="_blank"
                rel="noreferrer"
              >
                Open post
              </a>
              {item.link ? (
                <a
                  className="btn"
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                >
                  Link
                </a>
              ) : null}
              {hasDate(item) ? (
                <a className="btn" href={`/items/${item.id}/ics`}>
                  Add to calendar
                </a>
              ) : null}
              <form
                action={async () => {
                  "use server";
                  await setItemFlag(item.id, "seen", item.seen ? 0 : 1);
                }}
              >
                <button type="submit">{item.seen ? "Unseen" : "Seen"}</button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await setItemFlag(item.id, "starred", item.starred ? 0 : 1);
                }}
              >
                <button type="submit">
                  {item.starred ? "Unstar" : "Star"}
                </button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await setItemFlag(
                    item.id,
                    "dismissed",
                    item.dismissed ? 0 : 1,
                  );
                }}
              >
                <button type="submit">
                  {item.dismissed ? "Restore" : "Dismiss"}
                </button>
              </form>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
