import { StemContactView } from "../components/StemContactView";
import { PageHeader } from "../components/ui/page-header";

export function StemContactsPage() {
  return (
    <div className="container mx-auto py-8">
      <PageHeader
        title="STEM Contacts"
        description="View and manage your imported STEM list contacts"
      />
      <div className="mt-8">
        <StemContactView />
      </div>
    </div>
  );
}