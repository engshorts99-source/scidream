---
id: proto-004
title: "LDH Assay (세포사멸 측정)"
duration: 4 hr
actions:
  [
    {
      "id": "act-030",
      "title": "상층액 수집",
      "duration": "10 min",
      "status": "idle",
      "inputs": [
        "mature_bmdm"
      ],
      "outputs": [
        "supernatant"
      ],
      "inventoryRefs": [],
      "variables": []
    },
    {
      "id": "act-031",
      "title": "LDH 시약 반응",
      "duration": "30 min",
      "status": "idle",
      "inputs": [
        "supernatant"
      ],
      "outputs": [
        "ldh_reaction"
      ],
      "inventoryRefs": [
        "inv-ldh-kit"
      ],
      "variables": []
    },
    {
      "id": "act-032",
      "title": "흡광도 측정 (490nm)",
      "duration": "15 min",
      "status": "idle",
      "inputs": [
        "ldh_reaction"
      ],
      "outputs": [
        "ldh_values"
      ],
      "inventoryRefs": [],
      "variables": []
    }
  ]
---

LDH 방출 기반 세포사멸 정량
