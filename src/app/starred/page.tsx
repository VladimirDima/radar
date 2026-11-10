import { ItemList } from "@/components/ItemList";
import { listItems } from "@/lib/queries";

export default function StarredPage() {
  const items = listItems("starred");
  return (
    <>
      <div className="page-head">
        <h1>Starred</h1>
      </div>
      <ItemList items={items} />
    </>
  );
}
