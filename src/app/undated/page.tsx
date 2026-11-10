import { ItemList } from "@/components/ItemList";
import { listItems } from "@/lib/queries";

export default function UndatedPage() {
  const items = listItems("undated");
  return (
    <>
      <div className="page-head">
        <h1>Undated</h1>
      </div>
      <ItemList items={items} />
    </>
  );
}
