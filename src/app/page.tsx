import { ItemList } from "@/components/ItemList";
import { listItems } from "@/lib/queries";
import { markAllSeen } from "./actions";

export default function FeedPage() {
  const items = listItems("feed");

  return (
    <>
      <div className="page-head">
        <h1>Feed</h1>
        <form action={markAllSeen}>
          <button type="submit">Mark all seen</button>
        </form>
      </div>
      <ItemList items={items} />
    </>
  );
}
