import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export function downloadExcel(plan) {
  if (!plan) return;

  const rows = plan.assignments.map((a) => ({
    Tour: a.tour,
    "Assigned Persons": a.assignedPersons?.join(", ") || "",
    "Missing Skills": "",
  }));

  if (plan.unassignedTours?.length) {
    plan.unassignedTours.forEach((t) => {
      const missing = (t.missingSkills || [])
        .map((s) => `${s.id} (${s.numberOfPersons})`)
        .join(", ");
      rows.push({
        Tour: t.tour + " (Unassigned)",
        "Assigned Persons": "",
        "Missing Skills": missing,
      });
    });
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Final Plan");
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
  saveAs(blob, "final_plan.xlsx");
}
