import React from "react";
import { Paper, Typography, Box } from "@mui/material";
import { useDroppable } from "@dnd-kit/core";

export default function DroppableColumn({ id, title, children, highlight = false }) {
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
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography variant="h6" sx={{ mb: 1 }}>
        {title}
      </Typography>

      {/* Always render an inner box to keep the column droppable */}
      <Box sx={{ flexGrow: 1, minHeight: 150 }}>
        {children && React.Children.count(children) > 0 ? children : null}
      </Box>
    </Paper>
  );
}
