---
id: proto-005
title: "ELISA (사이토카인 측정)"
duration: 2 days
actions:
  [
    {
      "id": "act-040",
      "title": "Capture Ab 코팅",
      "duration": "Overnight",
      "status": "idle",
      "inputs": [],
      "outputs": [
        "coated_plate"
      ],
      "inventoryRefs": [
        "inv-elisa-il1b"
      ],
      "variables": [
        {
          "name": "target",
          "options": [
            "IL-1β",
            "TNF-α",
            "IL-18",
            "IFN-β"
          ],
          "default": "IL-1β"
        }
      ]
    },
    {
      "id": "act-041",
      "title": "샘플 및 Standard 로딩",
      "duration": "2 hr",
      "status": "idle",
      "inputs": [
        "coated_plate",
        "supernatant"
      ],
      "outputs": [
        "loaded_plate"
      ],
      "inventoryRefs": [],
      "variables": []
    },
    {
      "id": "act-042",
      "title": "Detection Ab + HRP",
      "duration": "2 hr",
      "status": "idle",
      "inputs": [
        "loaded_plate"
      ],
      "outputs": [
        "detected_plate"
      ],
      "inventoryRefs": [],
      "variables": []
    },
    {
      "id": "act-043",
      "title": "TMB 발색 및 측정",
      "duration": "30 min",
      "status": "idle",
      "inputs": [
        "detected_plate"
      ],
      "outputs": [
        "elisa_values"
      ],
      "inventoryRefs": [
        "inv-tmb"
      ],
      "variables": []
    }
  ]
---

IL-1β, TNF-α, IL-18 등 사이토카인 정량
