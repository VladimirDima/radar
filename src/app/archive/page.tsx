import { ItemList } from "@/components/ItemList";
import { listItems } from "@/lib/queries";

export default function ArchivePage() {
  const items = listItems("archive");
  return (
    <>
      <div className="page-head">
        <h1>Archive</h1>
      </div>
      <ItemList items={items} />
    </>
  );
}
