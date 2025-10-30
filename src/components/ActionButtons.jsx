import React from "react";
import { Stack, Button } from "@mui/material";

export default function ActionButtons({
  agentStatus,
  finalPlan,
  onValidate,
  onFinalize,
  onDownload,
}) {
  return (
    <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
      <Button variant="contained" color="secondary" onClick={onValidate}>
        Validate / Update Plan
      </Button>

      <Button variant="contained" color="success" onClick={onFinalize}>
        Finalize Plan ✅
      </Button>

      {agentStatus === "finalized" && finalPlan && (
        <Button
          variant="outlined"
          color="primary"
          onClick={() => onDownload(finalPlan)}
        >
          ⬇️ Download Excel
        </Button>
      )}
    </Stack>
  );
}
