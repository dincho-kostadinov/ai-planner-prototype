import React, { useState } from "react";
import { Box, Typography, Paper, Snackbar, Alert } from "@mui/material";
import { useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import axios from "axios";

import PlannerInput from "./components/PlannerInput";
import PlannerBoard from "./components/PlannerBoard";
import ActionButtons from "./components/ActionButtons";
import { downloadExcel } from "./utils/excelUtils";

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

  /* --- Generate plan --- */
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

  /* --- Drag and drop Logic --- */
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
    if (!over) return;

    const { tour: fromTour, person: activePerson } = parseId(active.id);
    const { tour: toTour, person: overPerson } = parseId(over.id);

    const sourceTour = assignments[fromTour]
      ? fromTour
      : findTourByPerson(activePerson);
    const targetTour = assignments[toTour]
      ? toTour
      : findTourByPerson(overPerson);

    if (!sourceTour || !targetTour || !activePerson) return;

    if (sourceTour === targetTour) {
      const items = assignments[sourceTour];
      const oldIndex = items.indexOf(activePerson);
      const newIndex = items.indexOf(overPerson);
      const newItems = [...items];
      if (oldIndex > -1 && newIndex > -1) {
        newItems.splice(newIndex, 0, newItems.splice(oldIndex, 1)[0]);
      }
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

  /* --- Validate --- */
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
      const res = await axios.post("http://localhost:5000/api/update-agent", updatedPlan);
      const response = pickPlan(res.data);
      if (response?.assignments) {
        setAssignments(convertAssignments(response));
        setUnassignedTours(response.unassignedTours || []);
        setAgentStatus("validated");
        setMessage("Plan validated successfully!");
      } else {
        setMessage("Sent for validation. No major changes.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Error sending plan update!");
    } finally {
      setOpen(true);
    }
  };

  /* --- Finalize --- */
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
      const res = await axios.post("http://localhost:5000/api/finalize-agent", finalPlanPayload);
      const response = res.data?.finalPlan || res.data?.plan || res.data;
      if (response?.assignments) {
        setAssignments(convertAssignments(response));
        setUnassignedTours(response.unassignedTours || []);
        setFinalPlan(response);
      }
      setAgentStatus("finalized");
      setMessage("Plan finalized successfully!");
    } catch (err) {
      console.error(err);
      setMessage("Error finalizing plan!");
    } finally {
      setOpen(true);
    }
  };

  /* --- Render --- */
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        AI Route Assistant Planner
      </Typography>

      <PlannerInput
        prompt={prompt}
        setPrompt={setPrompt}
        loading={loading}
        onGenerate={handleGenerate}
      />

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

          <PlannerBoard
            sensors={sensors}
            assignments={assignments}
            unassignedTours={unassignedTours}
            makeItemId={makeItemId}
            handleDragStart={handleDragStart}
            handleDragEnd={handleDragEnd}
            activeId={activeId}
            activeLabel={activeLabel}
          />

          <ActionButtons
            agentStatus={agentStatus}
            finalPlan={finalPlan}
            onValidate={handleSendUpdate}
            onFinalize={handleFinalize}
            onDownload={downloadExcel}
          />
        </>
      )}

      <Snackbar open={open} autoHideDuration={4000} onClose={() => setOpen(false)}>
        <Alert severity="info" sx={{ width: "100%" }}>
          {message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
