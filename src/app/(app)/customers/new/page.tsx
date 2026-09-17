import { CustomerFields } from "@/components/customer-form";
import { Card, ErrorNote, PageHeader } from "@/components/ui";
import { createCustomer } from "@/app/actions/customers";

export default async function NewCustomerPage(props: PageProps<"/customers/new">) {
  const sp = await props.searchParams;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New customer" />
      <ErrorNote message={typeof sp.error === "string" ? sp.error : null} />
      <Card>
        <form action={createCustomer} className="space-y-4">
          <CustomerFields />
          <button className="btn" type="submit">Save customer</button>
        </form>
      </Card>
    </div>
  );
}
