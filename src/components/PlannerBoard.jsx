import React from "react";
import { Grid, Typography } from "@mui/material";
import {
    DndContext,
    closestCenter,
    DragOverlay,
} from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import DroppableColumn from "./DroppableColumn";
import SortableItem from "./SortableItem";

export default function PlannerBoard({
    sensors,
    assignments,
    unassignedTours,
    makeItemId,
    handleDragStart,
    handleDragEnd,
    activeId,
    activeLabel,
}) {
    return (
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
                                items={assignments[tour].map((p) => makeItemId(tour, p))}
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
                                    {Array.isArray(t.missingSkills)
                                        ? t.missingSkills.map((s) => `${s.id} (${s.numberOfPersons})`).join(", ")
                                        : "No details available"}
                                </Typography>
                            </DroppableColumn>
                        </Grid>
                    ))}
            </Grid>

            <DragOverlay>
                {activeId ? <SortableItem id={activeId} label={activeLabel} /> : null}
            </DragOverlay>
        </DndContext>
    );
}
