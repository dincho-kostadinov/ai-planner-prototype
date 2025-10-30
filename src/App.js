import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Grid,
  Snackbar,
  Alert,
  Stack,
} from "@mui/material";
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/* ========== Sortable Person Card ========== */
function SortableItem({ id, label }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: "grab",
    backgroundColor: "#e3f2fd",
    padding: 8,
    marginBottom: 8,
    borderRadius: 8,
    textAlign: "center",
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {label}
    </div>
  );
}

/* ========== Droppable Column (Tour) ========== */
function DroppableColumn({ id, title, children, highlight = false }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <Paper
      ref={setNodeRef}
      sx={{
        p: 2,
        minHeight: 250,
        borderRadius: 3,
        backgroundColor: highlight ? "#ffebee" : "white",
        outline: isOver ? "2px dashed #1976d2" : "none",
        outlineOffset: 4,
        transition: "outline .1s ease",
      }}
    >
      <Typography variant="h6" sx={{ mb: 1 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

const makeItemId = (tour, person) => `${tour}::${person}`;
const parseId = (id) => {
  if (id.includes("::")) {
    const [tour, person] = id.split("::");
    return { tour, person };
  }
  return { tour: id, person: null };
};

export default function PlannerApp() {
  const [prompt, setPrompt] = useState("");
  const [planInput, setPlanInput] = useState({ persons: [], tours: [] });
  const [assignments, setAssignments] = useState({});
  const [unassignedTours, setUnassignedTours] = useState([]);
  const [finalPlan, setFinalPlan] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [activeLabel, setActiveLabel] = useState(null);
  const [agentStatus, setAgentStatus] = useState("");
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  const pickPlan = (data) => data?.plan || data;
  const convertAssignments = (plan) => {
    const formatted = {};
    plan.assignments.forEach((a) => {
      formatted[a.tour] = a.assignedPersons || [];
    });
    return formatted;
  };

  /* -------- Generate plan -------- */
  const handleGenerate = async () => {
    setLoading(true);
    try {
      let payload = prompt;
      if (prompt.trim()) {
        try {
          payload = JSON.parse(prompt);
          setPlanInput(payload);
        } catch {
          setMessage("Please provide valid JSON for persons + tours.");
          setOpen(true);
          setLoading(false);
          return;
        }
      }

      const res = await axios.post("http://localhost:5000/api/run-agent", {
        prompt: payload,
      });

      const plan = pickPlan(res.data);
      if (plan?.assignments && Array.isArray(plan.assignments)) {
        setAssignments(convertAssignments(plan));
        setUnassignedTours(plan.unassignedTours || []);
        setAgentStatus("planned");
        setMessage("Plan generated successfully!");
      } else {
        setAssignments({});
        setUnassignedTours([]);
        setMessage("Agent did not return a valid plan.");
      }
    } catch (err) {
      console.error("Error fetching plan:", err);
      setMessage("Error fetching plan from agent.");
    } finally {
      setOpen(true);
      setLoading(false);
    }
  };

  /* -------- DnD logic -------- */
  const findTourByPerson = (person) => {
    return Object.keys(assignments).find((tour) =>
      assignments[tour].includes(person)
    );
  };

  const handleDragStart = (event) => {
    const { id } = event.active;
    const { person } = parseId(id);
    setActiveId(id);
    setActiveLabel(person || id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) {
      setActiveId(null);
      setActiveLabel(null);
      return;
    }

    const { tour: fromTour, person: activePerson } = parseId(active.id);
    const { tour: toTour, person: overPerson } = parseId(over.id);

    const sourceTour = assignments[fromTour]
      ? fromTour
      : findTourByPerson(activePerson);
    const targetTour = assignments[toTour]
      ? toTour
      : findTourByPerson(overPerson);

    if (!sourceTour || !targetTour || !activePerson) {
      setActiveId(null);
      setActiveLabel(null);
      return;
    }

    if (sourceTour === targetTour) {
      const items = assignments[sourceTour];
      const oldIndex = items.indexOf(activePerson);
      const newIndex = items.indexOf(overPerson);
      const newItems = arrayMove(items, oldIndex, newIndex);
      setAssignments({ ...assignments, [sourceTour]: newItems });
    } else {
      const start = Array.from(assignments[sourceTour]);
      const end = Array.from(assignments[targetTour]);
      const oldIndex = start.indexOf(activePerson);
      if (oldIndex > -1) start.splice(oldIndex, 1);
      if (!end.includes(activePerson)) end.push(activePerson);
      setAssignments({
        ...assignments,
        [sourceTour]: start,
        [targetTour]: end,
      });
    }

    setActiveId(null);
    setActiveLabel(null);
  };

  /* -------- Validate / Update -------- */
  const handleSendUpdate = async () => {
    const updatedPlan = {
      mode: "validate",
      data: {
        persons: planInput.persons,
        tours: planInput.tours,
        assignments: Object.entries(assignments).map(([tour, persons]) => ({
          tour,
          assignedPersons: persons,
        })),
        unassignedTours,
      },
    };

    try {
      const res = await axios.post(
        "http://localhost:5000/api/update-agent",
        updatedPlan
      );
      const response = pickPlan(res.data);
      if (response?.assignments) {
        setAssignments(convertAssignments(response));
        setUnassignedTours(response.unassignedTours || []);
        setAgentStatus("validated");
        setMessage("✅ Plan validated successfully!");
      } else {
        setMessage("⚙️ Sent for validation. No major changes.");
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Error sending plan update!");
    } finally {
      setOpen(true);
    }
  };

  /* -------- Finalize -------- */
  const handleFinalize = async () => {
    const finalPlanPayload = {
      mode: "finalize",
      data: {
        persons: planInput.persons,
        tours: planInput.tours,
        assignments: Object.entries(assignments).map(([tour, persons]) => ({
          tour,
          assignedPersons: persons,
        })),
        unassignedTours,
      },
    };

    try {
      const res = await axios.post(
        "http://localhost:5000/api/finalize-agent",
        finalPlanPayload
      );
      const response = res.data?.finalPlan || res.data?.plan || res.data;
      if (response?.assignments) {
        setAssignments(convertAssignments(response));
        setUnassignedTours(response.unassignedTours || []);
        setFinalPlan(response);
      }
      setAgentStatus("finalized");
      setMessage("🏁 Plan finalized successfully!");
    } catch (err) {
      console.error(err);
      setMessage("❌ Error finalizing plan!");
    } finally {
      setOpen(true);
    }
  };

  /* -------- 📦 Download Excel -------- */
  const downloadExcel = (plan) => {
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
  };

  /* -------- Render -------- */
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        AI Route Assistant Planner
      </Typography>

      {/* === INPUT === */}
      <Box sx={{ mb: 3 }}>
        <TextField
          label="Planner Prompt (JSON)"
          fullWidth
          multiline
          rows={6}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={`{
  "persons": [ {    
      "name": "UserA-driver-weapon",    
      "skills": ["driver_license", "weapon"]    
    },    
    {    
      "name": "UserB-driver-firstaid",    
      "skills": ["driver_license", "first_aid"]    
    },  ],
  "tours": [ {    
      "name": "Tour 1 (total 3 persons) (weapon-1) (driver-2)",    
      "numberOfPersons": 3,    
      "requiredSkills": [    
        { "id": "weapon", "numberOfPersons": 1 },    
        { "id": "driver_license", "numberOfPersons": 2 }    
      ]    
    },    
    {    
      "name": "Tour 2 (total 4 persons) (weapon-1) (driver-2)(firstaid-1)",    
      "numberOfPersons": 4,    
      "requiredSkills": [    
        { "id": "weapon", "numberOfPersons": 1 },    
        { "id": "driver_license", "numberOfPersons": 2 },    
        { "id": "first_aid", "numberOfPersons": 1 }    
      ]    
    },    ]
}`}
        />
        <Button
          sx={{ mt: 2 }}
          variant="contained"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate Plan"}
        </Button>
      </Box>

      {/* === PLANNER === */}
      {Object.keys(assignments).length > 0 && (
        <>
          <Paper
            sx={{
              p: 2,
              mb: 3,
              backgroundColor:
                agentStatus === "validated"
                  ? "#e8f5e9"
                  : agentStatus === "finalized"
                    ? "#ede7f6"
                    : "#e3f2fd",
            }}
          >
            <Typography variant="subtitle1">
              Agent status: <strong>{agentStatus || "N/A"}</strong>
            </Typography>
          </Paper>

          {/* === DRAG AND DROP === */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <Grid container spacing={3}>
              {Object.keys(assignments).map((tour) => (
                <Grid item xs={12} md={3} key={tour}>
                  <DroppableColumn id={tour} title={tour}>
                    <SortableContext
                      items={assignments[tour].map((p) =>
                        makeItemId(tour, p)
                      )}
                      strategy={verticalListSortingStrategy}
                    >
                      {assignments[tour].map((person) => (
                        <SortableItem
                          key={makeItemId(tour, person)}
                          id={makeItemId(tour, person)}
                          label={person}
                        />
                      ))}
                    </SortableContext>
                  </DroppableColumn>
                </Grid>
              ))}

              {unassignedTours.length > 0 &&
                unassignedTours.map((t) => (
                  <Grid item xs={12} md={3} key={t.tour}>
                    <DroppableColumn
                      id={t.tour}
                      title={`${t.tour} (Unassigned)`}
                      highlight
                    >
                      <Typography variant="body2" color="error">
                        Missing skills:{" "}
                        {t.missingSkills
                          .map((s) => `${s.id} (${s.numberOfPersons})`)
                          .join(", ")}
                      </Typography>
                    </DroppableColumn>
                  </Grid>
                ))}
            </Grid>

            <DragOverlay>
              {activeId ? (
                <SortableItem id={activeId} label={activeLabel} />
              ) : null}
            </DragOverlay>
          </DndContext>

          {/* === ACTION BUTTONS === */}
          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleSendUpdate}
            >
              Validate / Update Plan
            </Button>

            <Button
              variant="contained"
              color="success"
              onClick={handleFinalize}
            >
              Finalize Plan ✅
            </Button>

            {agentStatus === "finalized" && finalPlan && (
              <Button
                variant="outlined"
                color="primary"
                onClick={() => downloadExcel(finalPlan)}
              >
                ⬇️ Download Excel
              </Button>
            )}
          </Stack>
        </>
      )}

      <Snackbar
        open={open}
        autoHideDuration={4000}
        onClose={() => setOpen(false)}
      >
        <Alert severity="info" sx={{ width: "100%" }}>
          {message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
