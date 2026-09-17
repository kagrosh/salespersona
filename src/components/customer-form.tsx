import { Field, Select } from "@/components/ui";
import type { CustomerRow } from "@/lib/types";

export function CustomerFields({ c }: { c?: Partial<CustomerRow> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Full name" className="sm:col-span-2">
        <input name="full_name" className="input" required defaultValue={c?.full_name ?? ""} />
      </Field>
      <Field label="Email">
        <input name="email" type="email" className="input" defaultValue={c?.email ?? ""} />
      </Field>
      <Field label="Phone">
        <input name="phone" className="input" defaultValue={c?.phone ?? ""} />
      </Field>
      <Field label="Customer market" hint="Separate from language, logistics and property location.">
        <Select name="customer_market" defaultValue={c?.customer_market ?? "unknown"} options={[{ key: "unknown", label: "Unknown" }, { key: "turkish", label: "Turkish" }, { key: "international", label: "International" }]} />
      </Field>
      <Field label="Preferred sales language" hint="Language for customer-facing drafts (en, tr, de, ru...).">
        <input name="preferred_language" className="input" defaultValue={c?.preferred_language ?? "en"} maxLength={8} />
      </Field>
      <Field label="Purchase logistics">
        <Select name="purchase_logistics" defaultValue={c?.purchase_logistics ?? "unknown"} options={[{ key: "unknown", label: "Unknown" }, { key: "local", label: "Buying in person / locally" }, { key: "remote", label: "Buying remotely / from abroad" }, { key: "mixed", label: "Mixed: visits plus remote steps" }]} />
      </Field>
      <Field label="Investment experience">
        <Select name="investment_experience" defaultValue={c?.investment_experience ?? "unknown"} options={[{ key: "unknown", label: "Unknown" }, { key: "first", label: "First property investment" }, { key: "some", label: "Owns 1–2 properties" }, { key: "experienced", label: "Experienced investor" }]} />
      </Field>
      <Field label="Interests" className="sm:col-span-2" hint="Tracks, areas, project types. A customer can be interested in both homes and plots.">
        <input name="interests" className="input" defaultValue={c?.interests ?? ""} />
      </Field>
      <Field label="Notes (customer's ongoing preferences, not one deal's budget)" className="sm:col-span-2">
        <textarea name="notes" className="textarea" defaultValue={c?.notes ?? ""} />
      </Field>
    </div>
  );
}
