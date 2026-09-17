import { Field, Select } from "@/components/ui";
import { CATEGORIES, DOC_STATUS, PROJECT_STAGES } from "@/domain/vocabulary";
import type { ProjectRow } from "@/lib/types";

export function ProjectFields({ p }: { p?: Partial<ProjectRow> }) {
  const allCategories = [...CATEGORIES.home, ...CATEGORIES.land];
  const allStages = [...PROJECT_STAGES.home, ...PROJECT_STAGES.land];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Project name" className="sm:col-span-2">
        <input name="name" className="input" required defaultValue={p?.name ?? ""} />
      </Field>
      <Field label="Investment track">
        <Select name="track" defaultValue={p?.track ?? "home"} options={[{ key: "home", label: "Apartment / home" }, { key: "land", label: "Plot / land" }]} />
      </Field>
      <Field label="Category">
        <Select name="category" defaultValue={p?.category ?? ""} blank="Not stated" options={allCategories} />
      </Field>
      <Field label="Stage">
        <Select name="stage" defaultValue={p?.stage ?? ""} blank="Not stated" options={allStages} />
      </Field>
      <Field label="Developer / seller">
        <input name="developer" className="input" defaultValue={p?.developer ?? ""} />
      </Field>
      <Field label="Location" hint="City / country. Never assumed.">
        <input name="location" className="input" defaultValue={p?.location ?? ""} />
      </Field>
      <Field label="Jurisdiction (for any legal/tax question)">
        <input name="jurisdiction" className="input" defaultValue={p?.jurisdiction ?? ""} />
      </Field>
      <Field label="Description" className="sm:col-span-2">
        <textarea name="description" className="textarea" defaultValue={p?.description ?? ""} />
      </Field>
      <Field label="Selling points (supplied claims)">
        <textarea name="selling_points" className="textarea" defaultValue={p?.selling_points ?? ""} />
      </Field>
      <Field label="Limitations / disadvantages">
        <textarea name="limitations" className="textarea" defaultValue={p?.limitations ?? ""} />
      </Field>
      <Field label="Plots: marketed use" hint="What marketing says.">
        <input name="marketed_use" className="input" defaultValue={p?.marketed_use ?? ""} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Plots: documented permitted use" className="sm:col-span-2" hint="Only what documents on file say.">
          <input name="documented_permitted_use" className="input" defaultValue={p?.documented_permitted_use ?? ""} />
        </Field>
        <Field label="Status">
          <Select name="permitted_use_status" defaultValue={p?.permitted_use_status ?? "undocumented"} options={DOC_STATUS} />
        </Field>
      </div>
      <Field label="Ongoing homes: delivery claims" hint="What the developer claims.">
        <input name="delivery_claims" className="input" defaultValue={p?.delivery_claims ?? ""} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Ongoing homes: documented milestones" className="sm:col-span-2" hint="Only documented milestones.">
          <input name="documented_milestones" className="input" defaultValue={p?.documented_milestones ?? ""} />
        </Field>
        <Field label="Status">
          <Select name="milestones_status" defaultValue={p?.milestones_status ?? "undocumented"} options={DOC_STATUS} />
        </Field>
      </div>
      <p className="text-xs text-neutral-500 sm:col-span-2">Marketed use is not permitted use; a claim is not a milestone. &quot;Documented&quot; requires the documented text; &quot;pending&quot; means requested, not on file.</p>
    </div>
  );
}
