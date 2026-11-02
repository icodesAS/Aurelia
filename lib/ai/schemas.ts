export const matchExplainSchema = {
  type: "object",
  properties: {
    headline: { type: "string" },
    whyYouClick: {
      type: "array",
      items: { type: "string" },
      minItems: 2,
      maxItems: 3,
    },
    watchOuts: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 2,
    },
    conversationStarters: {
      type: "array",
      items: { type: "string" },
      minItems: 2,
      maxItems: 2,
    },
    houseRule: { type: "string" },
  },
  required: [
    "headline",
    "whyYouClick",
    "watchOuts",
    "conversationStarters",
    "houseRule",
  ],
};

export const conciergeSchema = {
  type: "object",
  properties: {
    assistantMessage: { type: "string" },
    filters: {
      type: "object",
      properties: {
        areaKeywords: { type: "array", items: { type: "string" } },
        nearLandmark: { type: ["string", "null"] },
        maxRent: { type: ["integer", "null"] },
        bhk: { type: ["integer", "null"] },
        roomType: {
          type: "string",
          enum: ["private_room", "shared_room", "entire_flat", "unspecified"],
        },
        furnished: { type: ["boolean", "null"] },
        foodRule: {
          type: "string",
          enum: ["veg_only", "any", "unspecified"],
        },
        vibe: {
          type: "string",
          enum: ["quiet", "balanced", "lively", "unspecified"],
        },
        suitableFor: {
          type: "string",
          enum: ["any", "women_only", "men_only", "unspecified"],
        },
      },
      required: [
        "areaKeywords",
        "nearLandmark",
        "maxRent",
        "bhk",
        "roomType",
        "furnished",
        "foodRule",
        "vibe",
        "suitableFor",
      ],
    },
  },
  required: ["assistantMessage", "filters"],
};

export const listingWriterSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    tagline: { type: "string" },
    description: { type: "string" },
    tags: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
      maxItems: 8,
    },
    amenities: {
      type: "array",
      items: { type: "string" },
      maxItems: 8,
    },
    idealRoommate: { type: "string" },
    photoInsights: {
      type: "array",
      items: { type: "string" },
      maxItems: 4,
    },
    suggestedRent: {
      type: "object",
      properties: {
        low: { type: "integer" },
        recommended: { type: "integer" },
        high: { type: "integer" },
      },
      required: ["low", "recommended", "high"],
    },
    rentRationale: { type: "string" },
  },
  required: [
    "title",
    "tagline",
    "description",
    "tags",
    "amenities",
    "idealRoommate",
    "photoInsights",
    "suggestedRent",
    "rentRationale",
  ],
};

export const personaSchema = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "2 to 4 words, starts with 'The', e.g. The Quiet Curator",
    },
    tagline: {
      type: "string",
      description: "One sentence, max 14 words, warm and specific to the answers",
    },
  },
  required: ["name", "tagline"],
};

export const splitExplainSchema = {
  type: "object",
  properties: {
    explanation: { type: "string" },
  },
  required: ["explanation"],
};
