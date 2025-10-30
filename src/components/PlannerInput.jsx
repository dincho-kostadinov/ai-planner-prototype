import React from "react";
import { Box, TextField, Button } from "@mui/material";

export default function PlannerInput({ prompt, setPrompt, loading, onGenerate }) {
    return (
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
                onClick={onGenerate}
                disabled={loading}
            >
                {loading ? "Generating..." : "Generate Plan"}
            </Button>
        </Box>
    );
}
