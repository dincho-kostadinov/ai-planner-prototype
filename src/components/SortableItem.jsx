import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export default function SortableItem({ id, label }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: "grab",
    backgroundColor: isDragging ? "#bbdefb" : "#e3f2fd",
    padding: 8,
    marginBottom: 8,
    borderRadius: 8,
    textAlign: "center",
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      key={id}
    >
      {label || "Unnamed Person"}
    </div>
  );
}
